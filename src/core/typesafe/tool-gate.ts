import { createHash, randomBytes } from 'crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import path from 'path';
import type { RulebookConfig } from '../../types.js';
import {
    redactSecrets,
    resolveTypesafeKey,
    systemOne,
    TypesafeError,
    type Question,
} from './client.js';
import {
    appendCappedLine,
    isGateDisabled,
    loadGateSources,
    sliceUtf8,
    STATE_CAPS,
    type GateSourceLoaders,
} from './gate.js';

/**
 * Jev tool-call gate (v7.4, opt-in): the answer of a Claude Code `PreToolUse`
 * hook (`rulebook hook tool-gate`). The prompt gate judges what the operator
 * asked for; this one judges what an agent is about to run or write.
 *
 * Order, cheapest first: the wrapper (`jev-gate.sh tool`) runs the installed
 * `no-os-scheduling.sh` guard and returns its `deny` as-is; then a
 * deterministic destructive-git check answers `ask`; then the on-disk cache;
 * only then one batched Jev request — a redacted summary of the call plus a
 * small project context, one yes/no question per criterion — mapped to
 * `deny` / `ask` / nothing. The hook never answers `allow`, so the user's own
 * permission rules still decide everything the gate lets through. Every
 * failure (no key, timeout, network, bad response, any error) means no
 * answer: fail-open.
 */

export interface ToolHookConfig {
    enabled: boolean;
    /** PreToolUse matcher, also applied inside the hook. */
    matcher: string;
    /** A criterion below this → deny (in_task_scope: ask). */
    denyBelow: number;
    /** A criterion below this → ask. */
    askBelow: number;
    /** Deadline for everything after the pre-checks (sources, cache, Jev). */
    deadlineMs: number;
    cacheTtlMs: number;
}

export const TOOL_HOOK_DEFAULTS = {
    matcher: 'Bash|Edit|Write',
    denyBelow: 0.5,
    askBelow: 0.7,
    deadlineMs: 2_000,
    cacheTtlMs: 900_000,
} as const;

export const TOOL_HOOK_LIMITS = {
    deadlineMs: { min: 500, max: 5_000 },
    threshold: { min: 0, max: 1 },
    cacheTtlMs: { min: 0, max: 86_400_000 },
} as const;

/** Extra seconds between the hook's own deadline and Claude Code's `timeout` (CLI start-up). */
const TIMEOUT_MARGIN_SEC = 2;

function clamp(value: unknown, fallback: number, range: { min: number; max: number }): number {
    const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    return Math.min(range.max, Math.max(range.min, n));
}

/**
 * `gate.toolHook` with defaults applied and values clamped. Off unless turned
 * on explicitly, and always off when the operator opted out of TypeSafe.
 * `denyBelow` never exceeds `askBelow`.
 */
export function resolveToolHookConfig(
    config: Partial<RulebookConfig> | null | undefined
): ToolHookConfig {
    const raw = config?.gate?.toolHook ?? {};
    const askBelow = clamp(raw.askBelow, TOOL_HOOK_DEFAULTS.askBelow, TOOL_HOOK_LIMITS.threshold);
    const denyBelow = clamp(
        raw.denyBelow,
        TOOL_HOOK_DEFAULTS.denyBelow,
        TOOL_HOOK_LIMITS.threshold
    );
    return {
        enabled: config?.integrations?.typesafe?.enabled !== false && raw.enabled === true,
        matcher:
            typeof raw.matcher === 'string' && raw.matcher.trim()
                ? raw.matcher.trim()
                : TOOL_HOOK_DEFAULTS.matcher,
        denyBelow: Math.min(denyBelow, askBelow),
        askBelow,
        deadlineMs: Math.round(
            clamp(raw.deadlineMs, TOOL_HOOK_DEFAULTS.deadlineMs, TOOL_HOOK_LIMITS.deadlineMs)
        ),
        cacheTtlMs: Math.round(
            clamp(raw.cacheTtlMs, TOOL_HOOK_DEFAULTS.cacheTtlMs, TOOL_HOOK_LIMITS.cacheTtlMs)
        ),
    };
}

/** The settings.json `timeout` (seconds) for the tool hook: always longer than its deadline. */
export function toolHookTimeoutSec(deadlineMs: number): number {
    return Math.ceil(deadlineMs / 1000) + TIMEOUT_MARGIN_SEC;
}

/** Claude Code matcher semantics: `*` or empty matches every tool, otherwise a full-name regex. */
export function matchesTool(matcher: string, tool: string): boolean {
    if (matcher === '*' || matcher === '') return true;
    try {
        return new RegExp(`^(?:${matcher})$`).test(tool);
    } catch {
        return false;
    }
}

// ── Summary ──────────────────────────────────────────────────────────────

export const TOOL_SUMMARY_CAPS = {
    command: 1024,
    preview: 512,
    file: 256,
    /** Text scanned by redactSecrets() before clipping — far past any cap. */
    scan: 8192,
} as const;

export const ENV_FILE_PREVIEW = '[env file — not sent]';

/** The part of the PreToolUse payload the gate reads. */
export interface ToolCallInput {
    tool_name?: unknown;
    tool_input?: unknown;
}

export interface ToolCallSummary {
    tool: string;
    /** Bash */
    command?: string;
    /** Edit/Write (and any tool with a `file_path`): relative when inside the project. */
    file?: string;
    /** Edit: `old_string` / `new_string` lengths. */
    oldChars?: number;
    newChars?: number;
    /** Write: `content` length. */
    chars?: number;
    preview?: string;
}

function clip(text: string, max: number): string {
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

/** Redact first, then clip — a secret is never cut into an unrecognisable prefix. */
function clean(text: string, max: number): string {
    return clip(redactSecrets(text.slice(0, TOOL_SUMMARY_CAPS.scan)), max);
}

export function isEnvFile(filePath: string): boolean {
    return /^\.env/i.test(filePath.split(/[\\/]/).pop() ?? '');
}

/** Relative to the project when inside it, else as given; forward slashes. */
function displayPath(filePath: string, projectRoot: string): string {
    const rel = path.relative(projectRoot, path.resolve(projectRoot, filePath));
    const inside = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
    return (inside ? rel : filePath).replace(/\\/g, '/');
}

function stringField(obj: Record<string, unknown>, key: string): string | undefined {
    return typeof obj[key] === 'string' ? (obj[key] as string) : undefined;
}

/**
 * A compact, redacted description of one tool call, or null without a tool
 * name. Bash: the command (≤ 1024 chars). Edit: the file, old/new sizes and a
 * `new_string` preview (≤ 512). Write: the file, content size and a preview.
 * Other tools: the file when there is one and a JSON preview of the input.
 * `.env*` files never have their content previewed. Every string goes
 * through redactSecrets().
 */
export function summarizeToolCall(
    input: ToolCallInput,
    projectRoot: string
): ToolCallSummary | null {
    if (typeof input.tool_name !== 'string' || !input.tool_name) return null;
    const tool = input.tool_name;
    const ti =
        input.tool_input && typeof input.tool_input === 'object'
            ? (input.tool_input as Record<string, unknown>)
            : {};
    const summary: ToolCallSummary = { tool };
    const filePath = stringField(ti, 'file_path') ?? stringField(ti, 'notebook_path');
    const envFile = filePath !== undefined && isEnvFile(filePath);
    if (filePath !== undefined) {
        summary.file = clean(displayPath(filePath, projectRoot), TOOL_SUMMARY_CAPS.file);
    }
    const preview = (text: string) =>
        envFile ? ENV_FILE_PREVIEW : clean(text, TOOL_SUMMARY_CAPS.preview);

    switch (tool) {
        case 'Bash':
            summary.command = clean(stringField(ti, 'command') ?? '', TOOL_SUMMARY_CAPS.command);
            break;
        case 'Edit': {
            const next = stringField(ti, 'new_string') ?? '';
            summary.oldChars = (stringField(ti, 'old_string') ?? '').length;
            summary.newChars = next.length;
            summary.preview = preview(next);
            break;
        }
        case 'Write': {
            const content = stringField(ti, 'content') ?? '';
            summary.chars = content.length;
            summary.preview = preview(content);
            break;
        }
        default: {
            const rest = { ...ti };
            delete rest.file_path;
            delete rest.notebook_path;
            summary.preview = preview(JSON.stringify(rest));
        }
    }
    return summary;
}

// ── State and questions ──────────────────────────────────────────────────

/** Tier 1 rules Jev checks `follows_project_rules` against. */
export const TOOL_GATE_RULES = [
    'No destructive git (reset --hard, force push, clean -f, checkout -- ., restore ., stash, branch -D) without explicit operator authorization',
    'No OS-level scheduling (cron, systemd timers, launchd, schtasks); scheduling lives in the application',
    'Never bypass hooks or signing (--no-verify, --no-gpg-sign, disabling pre-commit or pre-push)',
    'Never read, print, log or commit secrets (API keys, tokens, passwords, .env contents)',
    'No stubs or TODO markers; implementations are complete',
] as const;

export const TOOL_STATE_MAX_BYTES = 3072;

export interface ToolGateState {
    project: { id?: string; languages?: string[] };
    task: { id: string; title: string } | null;
    rules: readonly string[];
    call: ToolCallSummary;
}

export function toolStateBytes(state: ToolGateState): number {
    return Buffer.byteLength(JSON.stringify(state));
}

/** Cut one summary field by the overflow, on a code-point boundary, until the state fits. */
function shrinkField(state: ToolGateState, field: 'preview' | 'command' | 'file'): void {
    let value = state.call[field];
    while (value && toolStateBytes(state) > TOOL_STATE_MAX_BYTES) {
        const body = value.endsWith('…') ? value.slice(0, -1) : value;
        if (!body) break;
        const over = toolStateBytes(state) - TOOL_STATE_MAX_BYTES;
        // +3: room for the ellipsis added back.
        value = sliceUtf8(body, Math.max(0, Buffer.byteLength(body) - over - 3)) + '…';
        state.call[field] = value;
    }
}

/**
 * What Jev sees: project id and languages, the active task (id + title), the
 * Tier 1 rules and the call summary. Hard cap 3072 bytes: the preview, then
 * the command, then the file path are cut; the language list goes last.
 */
export function buildToolGateState(
    config: Partial<RulebookConfig> | null,
    task: { id: string; title: string } | null,
    summary: ToolCallSummary
): ToolGateState {
    const state: ToolGateState = {
        project: {
            ...(config?.projectId ? { id: clip(config.projectId, 100) } : {}),
            ...(config?.languages?.length ? { languages: config.languages.slice(0, 10) } : {}),
        },
        task: task ? { id: task.id, title: clip(task.title, STATE_CAPS.taskTitle) } : null,
        rules: TOOL_GATE_RULES,
        call: { ...summary },
    };
    shrinkField(state, 'preview');
    shrinkField(state, 'command');
    shrinkField(state, 'file');
    if (toolStateBytes(state) > TOOL_STATE_MAX_BYTES) delete state.project.languages;
    return state;
}

/** Criteria, most severe first in the reason. Each noul is "the call is fine". */
export const TOOL_GATE_CRITERIA = [
    'safe_reversible',
    'no_secret_exposure',
    'follows_project_rules',
    'in_task_scope',
] as const;
export type ToolGateCriterion = (typeof TOOL_GATE_CRITERIA)[number];

/** Bumped whenever the questions change, so cached answers to old questions are not reused. */
export const TOOL_GATE_QUESTIONS_VERSION = 1;

/**
 * One noul per criterion — `in_task_scope` only when a task is active — for a
 * single systemOne() call per tool call.
 */
export function buildToolGateQuestions(state: ToolGateState): Record<string, Question> {
    const q: Record<string, Question> = {
        safe_reversible: {
            type: 'noul',
            instructions:
                "Is `call` (a coding agent's tool call in this project) safe and reversible?",
            criteria: {
                true: 'Reads, builds, tests, or makes ordinary edits that version control can undo',
                false: 'Deletes, overwrites or discards work, data or history that cannot easily be recovered, or changes systems outside the project',
            },
        },
        no_secret_exposure: {
            type: 'noul',
            instructions: 'Does `call` keep secrets private?',
            criteria: {
                true: 'Does not read, print, log, commit or send API keys, tokens, passwords or .env contents',
                false: 'Reads a secrets file, or prints, logs, commits or sends a secret',
            },
        },
        follows_project_rules: {
            type: 'noul',
            instructions: 'Does `call` follow every rule in `rules`?',
            criteria: {
                true: 'Breaks none of the rules',
                false: 'Breaks at least one rule in `rules`',
            },
        },
    };
    if (state.task) {
        q.in_task_scope = {
            type: 'noul',
            instructions: 'Does `call` belong to the work of the active `task`?',
            criteria: {
                true: 'Touches files, tests, docs or tooling the task plausibly needs',
                false: 'Unrelated to the task: a change or command far outside what it describes',
            },
        };
    }
    return q;
}

// ── Decision ─────────────────────────────────────────────────────────────

export type ToolGateDecision = 'deny' | 'ask' | 'none';

export interface ToolGateVerdict {
    decision: ToolGateDecision;
    /** `permissionDecisionReason`; empty for `none`. */
    reason: string;
}

const NONE: ToolGateVerdict = { decision: 'none', reason: '' };

const CRITERION_LABELS: Record<ToolGateCriterion, string> = {
    safe_reversible: 'may destroy work or be hard to undo',
    no_secret_exposure: 'may expose a secret',
    follows_project_rules: 'may break a Tier 1 project rule',
    in_task_scope: 'looks outside the active task',
};

const TURN_OFF =
    'Turn the gate off with "gate": {"toolHook": {"enabled": false}} in .rulebook/rulebook.json.';

/**
 * Per criterion: p < denyBelow → deny, p < askBelow → ask, else pass;
 * `in_task_scope` never goes past ask. The most severe level wins; the reason
 * lists every failing criterion with its probability. All pass → `none`.
 */
export function decideToolCall(
    answers: Record<string, number>,
    cfg: Pick<ToolHookConfig, 'denyBelow' | 'askBelow'>
): ToolGateVerdict {
    let decision: ToolGateDecision = 'none';
    const failing: string[] = [];
    for (const id of TOOL_GATE_CRITERIA) {
        const p = answers[id];
        if (typeof p !== 'number' || !Number.isFinite(p)) continue;
        let level: ToolGateDecision =
            p < cfg.denyBelow ? 'deny' : p < cfg.askBelow ? 'ask' : 'none';
        if (level === 'deny' && id === 'in_task_scope') level = 'ask';
        if (level === 'none') continue;
        failing.push(`${id} p=${p.toFixed(2)} (${CRITERION_LABELS[id]})`);
        if (level === 'deny' || decision === 'none') decision = level;
    }
    if (decision === 'none') return NONE;
    const advice =
        decision === 'deny'
            ? 'Take a safer route, or ask the operator.'
            : 'Confirm with the operator before running it.';
    return {
        decision,
        reason: `Rulebook tool gate (Jev): ${failing.join('; ')}. ${advice} ${TURN_OFF}`,
    };
}

// ── Deterministic pre-check ──────────────────────────────────────────────

/** A git invocation at the start of a command or after a shell separator, global options allowed. */
const GIT = String.raw`(?:^|[;&|(\n]|\$\()\s*(?:sudo\s+)?git(?:\s+(?:-C|-c)\s+(?:"[^"\n]*"|'[^'\n]*'|\S+)|\s+--[\w-]+(?:=\S+)?)*\s+`;
/** The rest of the same simple command. */
const ARGS = String.raw`[^;&|\n]*`;
const END = String.raw`(?=\s|$|[;&|)])`;

const DESTRUCTIVE_GIT: ReadonlyArray<[string, RegExp]> = [
    ['reset --hard', new RegExp(`${GIT}reset\\b${ARGS}\\s--hard\\b`)],
    [
        'push --force',
        new RegExp(
            `${GIT}push\\b${ARGS}\\s(?:--force(?:-with-lease|-if-includes)?\\b|-[A-Za-z]*f[A-Za-z]*\\b|\\+\\S)`
        ),
    ],
    ['clean -f', new RegExp(`${GIT}clean\\b${ARGS}\\s(?:--force\\b|-[A-Za-z]*f[A-Za-z]*\\b)`)],
    ['checkout -- .', new RegExp(`${GIT}checkout\\s+(?:--\\s+)?\\.\\/?${END}`)],
    ['restore .', new RegExp(`${GIT}restore\\b${ARGS}\\s\\.\\/?${END}`)],
    ['stash', new RegExp(`${GIT}stash\\b(?!\\s+(?:list|show)\\b)`)],
    [
        'branch -D',
        new RegExp(
            `${GIT}branch\\b${ARGS}\\s(?:-[A-Za-z]*D[A-Za-z]*\\b|--delete\\b${ARGS}\\s--force\\b|--force\\b${ARGS}\\s--delete\\b)`
        ),
    ],
];

/**
 * `ask` for a destructive git command (CLAUDE.md "Git safety"), else null.
 * No Jev call: the patterns are anchored to a git invocation, and a false
 * positive only costs a confirmation.
 */
export function destructiveGitCheck(command: string): ToolGateVerdict | null {
    for (const [label, pattern] of DESTRUCTIVE_GIT) {
        if (pattern.test(command)) {
            return {
                decision: 'ask',
                reason:
                    `Destructive git (${label}): CLAUDE.md "Git safety" requires explicit operator ` +
                    `authorization for this operation. Run it only if the operator asked for exactly this.`,
            };
        }
    }
    return null;
}

// ── Cache ────────────────────────────────────────────────────────────────

export const TOOL_GATE_CACHE_MAX_ENTRIES = 200;

export interface ToolGateCacheEntry {
    decision: ToolGateDecision;
    probabilities: Record<string, number>;
    /** Epoch ms when Jev answered. */
    t: number;
}

export function toolGateCachePath(projectRoot: string, rulebookDir: string): string {
    return path.join(projectRoot, rulebookDir, 'cache', 'tool-gate.json');
}

/** sha256(tool + redacted summary + active task id + question-set version). */
export function toolGateCacheKey(summary: ToolCallSummary, activeTaskId: string | null): string {
    return createHash('sha256')
        .update(
            [
                summary.tool,
                JSON.stringify(summary),
                activeTaskId ?? '',
                String(TOOL_GATE_QUESTIONS_VERSION),
            ].join('\0')
        )
        .digest('hex');
}

function isCacheEntry(value: unknown): value is ToolGateCacheEntry {
    const e = value as Partial<ToolGateCacheEntry> | null;
    return (
        !!e &&
        typeof e === 'object' &&
        typeof e.t === 'number' &&
        typeof e.decision === 'string' &&
        !!e.probabilities &&
        typeof e.probabilities === 'object' &&
        Object.values(e.probabilities).every((p) => typeof p === 'number')
    );
}

/** The cache entries; a missing, unreadable or malformed file is an empty cache. */
export async function readToolGateCache(file: string): Promise<Record<string, ToolGateCacheEntry>> {
    try {
        const parsed = JSON.parse(await readFile(file, 'utf-8')) as { entries?: unknown };
        const entries: Record<string, ToolGateCacheEntry> = {};
        if (parsed?.entries && typeof parsed.entries === 'object') {
            for (const [key, value] of Object.entries(parsed.entries)) {
                if (isCacheEntry(value)) entries[key] = value;
            }
        }
        return entries;
    } catch {
        return {};
    }
}

function isFresh(entry: ToolGateCacheEntry, now: number, ttlMs: number): boolean {
    const age = now - entry.t;
    return age >= 0 && age < ttlMs;
}

/**
 * Add one entry, drop expired ones, keep the newest 200, and write the file
 * atomically (temp file + rename). Best effort: errors are swallowed.
 */
async function writeToolGateCache(
    file: string,
    key: string,
    entry: ToolGateCacheEntry,
    ttlMs: number
): Promise<void> {
    const tmp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
    try {
        const entries = await readToolGateCache(file);
        entries[key] = entry;
        const kept = Object.entries(entries)
            .filter(([, e]) => isFresh(e, entry.t, ttlMs))
            .sort((a, b) => b[1].t - a[1].t)
            .slice(0, TOOL_GATE_CACHE_MAX_ENTRIES);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(tmp, JSON.stringify({ entries: Object.fromEntries(kept) }), 'utf-8');
        await rename(tmp, file);
    } catch {
        await rm(tmp, { force: true }).catch(() => undefined);
    }
}

// ── Run ──────────────────────────────────────────────────────────────────

export interface RunToolGateOptions {
    projectRoot: string;
    input: ToolCallInput;
    /** `<projectRoot>/.rulebook/rulebook.json` (null when absent). */
    config: Partial<RulebookConfig> | null;
    env?: NodeJS.ProcessEnv;
    fetch?: typeof fetch;
    /** Defaults to the project's task backend. */
    listTasks?: GateSourceLoaders['listTasks'];
}

interface ToolGateLogLine {
    summaryHash: string;
    tool: string;
    decision: ToolGateDecision;
    probabilities: Record<string, number>;
    cached: boolean;
    elapsedMs: number;
    precheck?: 'destructive-git';
    error?: string;
}

/**
 * One JSON line in `<rulebookDir>/logs/tool-gate.jsonl`: summary hash, tool,
 * decision, probabilities, cached, timing. Never the command text, file
 * content or key. Newest 500 lines kept; best effort.
 */
async function appendToolGateLog(
    projectRoot: string,
    rulebookDir: string,
    fields: ToolGateLogLine
): Promise<void> {
    try {
        await appendCappedLine(
            path.join(projectRoot, rulebookDir, 'logs', 'tool-gate.jsonl'),
            JSON.stringify({ ts: new Date().toISOString(), ...fields })
        );
    } catch {
        // best effort
    }
}

/**
 * Run the tool gate on one PreToolUse payload. Never throws; `none` means "no
 * answer" (skipped, passed, or failed open). Disabled, `RULEBOOK_GATE=off` or
 * a non-matching tool → `none` at once. A destructive git command → `ask`
 * without a key or a Jev call. Then, with a key and within `deadlineMs`:
 * cache hit → the cached answer; miss → one Jev request, cached on success.
 */
export async function runToolGate(opts: RunToolGateOptions): Promise<ToolGateVerdict> {
    const cfg = resolveToolHookConfig(opts.config);
    const env = opts.env ?? process.env;
    if (!cfg.enabled || isGateDisabled(env)) return NONE;
    const summary = summarizeToolCall(opts.input, opts.projectRoot);
    if (!summary || !matchesTool(cfg.matcher, summary.tool)) return NONE;

    const t0 = Date.now();
    const rulebookDir = opts.config?.rulebookDir ?? '.rulebook';
    const summaryHash = createHash('sha256')
        .update(JSON.stringify(summary))
        .digest('hex')
        .slice(0, 16);
    const log = async (
        fields: Omit<ToolGateLogLine, 'summaryHash' | 'tool' | 'elapsedMs'>
    ): Promise<void> => {
        if (opts.config?.features?.logging !== true) return;
        await appendToolGateLog(opts.projectRoot, rulebookDir, {
            summaryHash,
            tool: summary.tool,
            elapsedMs: Date.now() - t0,
            ...fields,
        });
    };

    const ti = opts.input.tool_input as Record<string, unknown> | undefined;
    const command = summary.tool === 'Bash' && ti ? stringField(ti, 'command') : undefined;
    const precheck = command ? destructiveGitCheck(command) : null;
    if (precheck) {
        await log({
            decision: precheck.decision,
            probabilities: {},
            cached: false,
            precheck: 'destructive-git',
        });
        return precheck;
    }

    const { key } = await resolveTypesafeKey(opts.projectRoot, env);
    if (!key) return NONE;

    /**
     * Reads only. The cache write and the log line happen after the race, so
     * work that loses to the deadline never writes into the project once the
     * hook has returned (it keeps running until the process exits).
     */
    type Outcome = {
        verdict: ToolGateVerdict;
        line: Omit<ToolGateLogLine, 'summaryHash' | 'tool' | 'elapsedMs'>;
        cache?: { file: string; key: string; entry: ToolGateCacheEntry };
    };
    const ask = async (): Promise<Outcome> => {
        try {
            const sources = await loadGateSources(opts.projectRoot, opts.config, {
                listTasks: opts.listTasks,
                loadDescription: async () => null,
            });
            const active = sources.tasks.find((t) => t.status === 'in-progress');
            const task = active ? { id: active.id, title: active.title } : null;

            const cacheFile = toolGateCachePath(opts.projectRoot, rulebookDir);
            const cacheKey = toolGateCacheKey(summary, task?.id ?? null);
            const hit = (await readToolGateCache(cacheFile))[cacheKey];
            if (hit && isFresh(hit, Date.now(), cfg.cacheTtlMs)) {
                const verdict = decideToolCall(hit.probabilities, cfg);
                return {
                    verdict,
                    line: {
                        decision: verdict.decision,
                        probabilities: hit.probabilities,
                        cached: true,
                    },
                };
            }

            const state = buildToolGateState(opts.config, task, summary);
            const questions = buildToolGateQuestions(state);
            const response = await systemOne(
                { state, model: 'jev-latest', questions },
                {
                    apiKey: key,
                    fetch: opts.fetch,
                    deadlineMs: Math.max(0, cfg.deadlineMs - (Date.now() - t0)),
                }
            );
            const probabilities: Record<string, number> = {};
            for (const id of Object.keys(questions)) {
                const a = response.answers[id];
                if (a?.type === 'noul') probabilities[id] = a.noul;
            }
            const verdict = decideToolCall(probabilities, cfg);
            return {
                verdict,
                line: { decision: verdict.decision, probabilities, cached: false },
                cache: {
                    file: cacheFile,
                    key: cacheKey,
                    entry: { decision: verdict.decision, probabilities, t: Date.now() },
                },
            };
        } catch (error) {
            return {
                verdict: NONE,
                line: {
                    decision: 'none',
                    probabilities: {},
                    cached: false,
                    error: error instanceof TypesafeError ? error.kind : 'bad-response',
                },
            };
        }
    };

    // systemOne honours the deadline itself; the race is the backstop for a
    // slow task backend or a fetch that ignores its abort signal.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), cfg.deadlineMs);
    });
    const outcome = await Promise.race([ask(), expired]).finally(() => clearTimeout(timer));
    if (!outcome) {
        await log({ decision: 'none', probabilities: {}, cached: false, error: 'timeout' });
        return NONE;
    }
    if (outcome.cache) {
        const { file, key: cacheKey, entry } = outcome.cache;
        await writeToolGateCache(file, cacheKey, entry, cfg.cacheTtlMs);
    }
    await log(outcome.line);
    return outcome.verdict;
}
