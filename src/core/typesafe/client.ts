import { readFile } from 'fs/promises';
import path from 'path';
import { TYPESAFE_ENV_VAR } from '../claude/typesafe-integration.js';

/**
 * Minimal TypeSafe System One client (v7.4 entry gate). Plain `fetch`, no
 * SDK: one POST, Bearer auth, a per-attempt timeout, an overall deadline, and
 * retries with exponential backoff + jitter on 429/529 and network errors.
 *
 * Secret hygiene: the key travels only in the Authorization header. Every
 * error message goes through `redact()`, and the key is never returned,
 * logged or written anywhere.
 */

export const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';

export type ChoiceQuestion = {
    type: 'choice';
    instructions: string;
    criteria: Record<string, string>;
};
export type NoulQuestion = {
    type: 'noul';
    instructions: string;
    criteria?: { true: string; false: string };
};
export type ScoreQuestion = { type: 'score'; instructions: string; criteria: string[] };
export type Question = ChoiceQuestion | NoulQuestion | ScoreQuestion;

export interface SystemOneRequest {
    state: unknown;
    model: 'jev-latest' | `jev-${string}`;
    questions: Record<string, Question>;
}

export type ChoiceAnswer = {
    type: 'choice';
    choice: string;
    confidence: number;
    probabilities: Record<string, number>;
};
/** Noul answers carry no `confidence` — the probability is the answer. */
export type NoulAnswer = { type: 'noul'; noul: number };
export type ScoreAnswer = {
    type: 'score';
    score: number;
    confidence: number;
    probabilities: Record<string, number>;
    legend: Record<string, string>;
};
export type Answer = ChoiceAnswer | NoulAnswer | ScoreAnswer;

export interface SystemOneResponse {
    model: string;
    answers: Record<string, Answer>;
    usage: { input_tokens: number; output_tokens: number };
}

export type TypesafeErrorKind = 'no-key' | 'http' | 'timeout' | 'network' | 'bad-response';

export class TypesafeError extends Error {
    constructor(
        public readonly kind: TypesafeErrorKind,
        message: string,
        public readonly status?: number
    ) {
        super(redact(message));
        this.name = 'TypesafeError';
    }
}

export interface ClientOptions {
    apiKey: string;
    fetch?: typeof fetch;
    /** Per-attempt timeout (default 10 s). */
    timeoutMs?: number;
    /** Retries after the first attempt on 429/529/network errors (default 2). */
    maxRetries?: number;
    /** Cap on the whole call, retries and backoff included. */
    deadlineMs?: number;
    sleep?: (ms: number) => Promise<void>;
    random?: () => number;
    now?: () => number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 2;
/** No retry is started with less than this much of the deadline left. */
const MIN_RETRY_WINDOW_MS = 1_000;
const RETRYABLE_STATUS = new Set([429, 529]);

/** Replace anything that looks like a TypeSafe key or a Bearer credential. */
export function redact(text: string): string {
    return text.replace(/Bearer\s+\S+/gi, 'Bearer ***').replace(/\bts_[A-Za-z0-9_-]{4,}/g, '***');
}

/**
 * `redact()` plus common credential shapes, for text rulebook sends to Jev
 * (the tool gate's call summary): OpenAI/Anthropic-style `sk-…` keys, GitHub
 * tokens (`ghp_…` and siblings, `github_pat_…`), AWS access key ids, Slack
 * tokens, PEM private-key blocks (to the end of the text when the END line is
 * missing), URL and `-u`/`--user` passwords (`https://user:***@host`,
 * `curl -u admin:***`), the value of `--password`/`--passwd`/`--secret…`/
 * `--api-key`/`--apikey`/`--token` flags (space or `=`), and the value —
 * quoted values whole — of any assignment whose name contains KEY, TOKEN,
 * SECRET or PASSWORD (`API_KEY=…`, `"password": "…"`).
 */
export function redactSecrets(text: string): string {
    return redact(text)
        .replace(
            /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
            '[private key redacted]'
        )
        .replace(/\bsk-[A-Za-z0-9_-]{8,}/g, 'sk-***')
        .replace(/\bgithub_pat_[A-Za-z0-9_]{8,}/g, 'github_pat_***')
        .replace(/\bgh[pousr]_[A-Za-z0-9]{8,}/g, 'gh*_***')
        .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, 'AKIA***')
        .replace(/\bxox[abprs]-[A-Za-z0-9-]{8,}/g, 'xox*-***')
        .replace(/\b([a-z][a-z0-9+.-]{0,20}:\/\/[^\s:@/]+:)[^\s@/]+@/gi, '$1***@')
        .replace(/((?:^|\s)(?:-u|--user)(?:\s+|=)["']?[^\s:"']+:)[^\s"']+/g, '$1***')
        .replace(
            /((?:^|\s)--(?:password|passwd|secret[\w-]*|api-?key|token)(?:\s+|=))(?:"[^"\n]*"|'[^'\n]*'|[^\s"']+)/gi,
            '$1***'
        )
        .replace(
            // Bounded name parts keep the scan linear on long identifier runs.
            /([A-Za-z0-9_.-]{0,40}(?:key|token|secret|password)[A-Za-z0-9_.-]{0,40}["']?\s*[:=](?![=>])\s*)("[^"\n]*"|'[^'\n]*'|["']?[^\s"',;&|]+)/gi,
            (_match, name: string, value: string) => {
                const quote = /^["']/.test(value) ? value[0] : '';
                const close = quote && value.length > 1 && value.endsWith(quote) ? quote : '';
                return `${name}${quote}***${close}`;
            }
        );
}

/** `redact()` plus the literal key, for keys that do not look like `ts_…`. */
function scrub(text: string, apiKey: string): string {
    return redact(text.split(apiKey).join('***'));
}

function backoffMs(attempt: number, random: () => number): number {
    return 400 * 2 ** attempt + random() * 200;
}

function validateResponse(body: unknown, req: SystemOneRequest): SystemOneResponse {
    if (!body || typeof body !== 'object') {
        throw new TypesafeError('bad-response', 'TypeSafe response is not a JSON object');
    }
    const r = body as Partial<SystemOneResponse>;
    if (!r.answers || typeof r.answers !== 'object') {
        throw new TypesafeError('bad-response', 'TypeSafe response has no answers');
    }
    for (const [id, q] of Object.entries(req.questions)) {
        const a = r.answers[id] as Partial<Answer> | undefined;
        if (!a || a.type !== q.type) {
            throw new TypesafeError(
                'bad-response',
                `TypeSafe answer "${id}" is missing or not of type ${q.type}`
            );
        }
        const wellFormed =
            a.type === 'noul'
                ? typeof (a as NoulAnswer).noul === 'number'
                : typeof (a as ChoiceAnswer | ScoreAnswer).confidence === 'number' &&
                  (a.type !== 'choice' || typeof (a as ChoiceAnswer).choice === 'string');
        if (!wellFormed) {
            throw new TypesafeError('bad-response', `TypeSafe answer "${id}" is malformed`);
        }
    }
    return {
        model: typeof r.model === 'string' ? r.model : 'unknown',
        answers: r.answers,
        usage: {
            input_tokens: r.usage?.input_tokens ?? 0,
            output_tokens: r.usage?.output_tokens ?? 0,
        },
    };
}

function httpMessage(status: number, bodyText: string): string {
    let detail = bodyText;
    try {
        const parsed = JSON.parse(bodyText) as { error?: { message?: unknown } };
        if (typeof parsed.error?.message === 'string') detail = parsed.error.message;
    } catch {
        // not JSON — keep the raw excerpt
    }
    const excerpt = detail.replace(/\s+/g, ' ').trim().slice(0, 200);
    return `TypeSafe HTTP ${status}${excerpt ? `: ${excerpt}` : ''}`;
}

/** One System One call. Throws `TypesafeError` (message redacted) on failure. */
export async function systemOne(
    req: SystemOneRequest,
    opts: ClientOptions
): Promise<SystemOneResponse> {
    const apiKey = opts.apiKey?.trim();
    if (!apiKey) throw new TypesafeError('no-key', `${TYPESAFE_ENV_VAR} is not set`);

    const doFetch = opts.fetch ?? globalThis.fetch;
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
    const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
    const random = opts.random ?? Math.random;
    const now = opts.now ?? Date.now;
    const deadline = opts.deadlineMs !== undefined ? now() + opts.deadlineMs : Infinity;
    const body = JSON.stringify(req);

    for (let attempt = 0; ; attempt++) {
        const remaining = deadline - now();
        if (remaining <= 0) {
            throw new TypesafeError('timeout', 'TypeSafe call exceeded its deadline');
        }
        const attemptMs = Math.min(timeoutMs, remaining);
        const outcome = await attemptOnce(doFetch, body, apiKey, attemptMs, req);
        if ('response' in outcome) return outcome.response;
        const retryable = outcome.retry;

        if (attempt >= maxRetries) throw retryable;
        const wait = backoffMs(attempt, random);
        if (deadline - now() - wait < MIN_RETRY_WINDOW_MS) throw retryable;
        await sleep(wait);
    }
}

type AttemptOutcome = { response: SystemOneResponse } | { retry: TypesafeError };

/**
 * One HTTP attempt: the parsed response, a retryable error (429/529 or a
 * network failure) to back off on, or a thrown terminal `TypesafeError`.
 */
async function attemptOnce(
    doFetch: typeof fetch,
    body: string,
    apiKey: string,
    attemptMs: number,
    req: SystemOneRequest
): Promise<AttemptOutcome> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), attemptMs);
    try {
        let res: Response;
        let text: string;
        try {
            res = await doFetch(TYPESAFE_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body,
                signal: controller.signal,
            });
            text = await res.text();
        } catch (error) {
            if (controller.signal.aborted) {
                throw new TypesafeError(
                    'timeout',
                    `TypeSafe call timed out after ${Math.round(attemptMs)} ms`
                );
            }
            const msg = error instanceof Error ? error.message : String(error);
            const err = new TypesafeError(
                'network',
                scrub(`TypeSafe network error: ${msg}`, apiKey)
            );
            // fetch reports connection failures as TypeError — worth a retry.
            if (error instanceof TypeError) return { retry: err };
            throw err;
        }

        if (res.ok) {
            let parsed: unknown;
            try {
                parsed = JSON.parse(text);
            } catch {
                throw new TypesafeError('bad-response', 'TypeSafe response is not JSON');
            }
            return { response: validateResponse(parsed, req) };
        }
        const err = new TypesafeError(
            'http',
            scrub(httpMessage(res.status, text), apiKey),
            res.status
        );
        if (RETRYABLE_STATUS.has(res.status)) return { retry: err };
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

export type TypesafeKeySource = 'env' | '.env' | null;

function unquote(value: string): string {
    const v = value.trim();
    if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) {
        return v.slice(1, -1).trim();
    }
    // Unquoted: a whitespace-preceded `#` starts an inline comment.
    return v.replace(/\s+#.*$/, '');
}

/**
 * The key from `process.env` first, else from `<projectRoot>/.env`. The MCP
 * server is spawned by Claude Code and may not inherit the shell profile, so
 * the project's untracked .env is the fallback. Only the TYPESAFE_API_KEY
 * line is read; nothing is assigned to `process.env`.
 */
export async function resolveTypesafeKey(
    projectRoot: string,
    env: NodeJS.ProcessEnv = process.env
): Promise<{ key: string | null; source: TypesafeKeySource }> {
    const fromEnv = env[TYPESAFE_ENV_VAR]?.trim();
    if (fromEnv) return { key: fromEnv, source: 'env' };

    let content: string;
    try {
        content = await readFile(path.join(projectRoot, '.env'), 'utf-8');
    } catch {
        return { key: null, source: null };
    }
    const pattern = new RegExp(`^\\s*(?:export\\s+)?${TYPESAFE_ENV_VAR}\\s*=\\s*(.+)$`);
    for (const line of content.split(/\r?\n/)) {
        const m = pattern.exec(line);
        if (!m) continue;
        const key = unquote(m[1]);
        if (key) return { key, source: '.env' };
    }
    return { key: null, source: null };
}
