import type { RulebookConfig } from '../../types.js';
import { readConfigFile, resolveProjectDescription, runGate } from '../../core/typesafe/gate.js';
import {
    promptHookAnswer,
    resolvePromptHookConfig,
    resolveScopeConfig,
} from '../../core/typesafe/prompt-hook.js';

/**
 * `rulebook hook <event>` — entry point for the Claude Code hooks rulebook
 * installs (v7.4), called by `.claude/hooks/jev-gate.sh`. Reads the hook JSON
 * from stdin, answers with at most one JSON object on stdout, and always
 * exits 0. Fail-open: an unknown event, unreadable or invalid stdin, a
 * disabled or unavailable gate, or any thrown error produce no output, so the
 * prompt (or tool call) goes through unchanged.
 *
 * Events: `prompt-gate` (UserPromptSubmit). New events add a handler to
 * HOOK_HANDLERS; stdin parsing, project-root and config resolution, output
 * and fail-open handling are shared.
 */

export const HOOK_EVENTS = ['prompt-gate'] as const;
export type HookEvent = (typeof HOOK_EVENTS)[number];

/** The Claude Code hook payload: common fields plus event-specific ones. */
export interface HookInput {
    hook_event_name?: string;
    cwd?: string;
    session_id?: string;
    /** UserPromptSubmit */
    prompt?: string;
    [key: string]: unknown;
}

export interface HookContext {
    projectRoot: string;
    env: NodeJS.ProcessEnv;
    fetch?: typeof fetch;
    /** `<projectRoot>/.rulebook/rulebook.json`, read once per call (null when absent). */
    config: Partial<RulebookConfig> | null;
}

/** Returns the JSON object to print, or null for "no answer". May throw (→ no answer). */
export type HookHandler = (input: HookInput, ctx: HookContext) => Promise<object | null>;

export interface HookCommandOptions {
    /** Hook payload; defaults to process.stdin. */
    stdin?: string | NodeJS.ReadableStream;
    /** Fallback project root when neither CLAUDE_PROJECT_DIR nor the payload's `cwd` is set. */
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    fetch?: typeof fetch;
    /** Receives the single output line; defaults to stdout. */
    log?: (line: string) => void;
}

/**
 * UserPromptSubmit: run the Jev entry gate on the prompt and hand the routing
 * to the model as `additionalContext`, or block a high-confidence OS
 * scheduling request (or an off-topic one, under `gate.scope.onOffTopic:
 * "block"`). The gate call is capped at `gate.promptHook.deadlineMs`.
 */
async function promptGate(input: HookInput, ctx: HookContext): Promise<object | null> {
    const cfg = resolvePromptHookConfig(ctx.config);
    if (!cfg.enabled) return null;
    const prompt = typeof input.prompt === 'string' ? input.prompt : '';
    if (!prompt.trim()) return null;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), cfg.deadlineMs);
    });
    // Read once: the description Jev sees is the one the scope lines quote.
    let description: string | null = null;
    const gate = runGate({
        projectRoot: ctx.projectRoot,
        prompt,
        env: ctx.env,
        fetch: ctx.fetch,
        deadlineMs: cfg.deadlineMs,
        loadConfig: async () => ctx.config,
        loadDescription: async () =>
            (description = await resolveProjectDescription(ctx.projectRoot, ctx.config)),
        source: 'hook',
    });
    // runGate honours the deadline itself; the race is the backstop for a
    // fetch that ignores its abort signal.
    const result = await Promise.race([gate, expired]).finally(() => clearTimeout(timer));
    if (!result) return null;

    const answer = promptHookAnswer(
        result,
        cfg,
        description ? { ...resolveScopeConfig(ctx.config), description } : undefined
    );
    switch (answer.kind) {
        case 'block':
            return { decision: 'block', reason: answer.reason };
        case 'context':
            return {
                hookSpecificOutput: {
                    hookEventName: 'UserPromptSubmit',
                    additionalContext: answer.additionalContext,
                },
            };
        case 'none':
            return null;
        default: {
            const _exhaustive: never = answer;
            return _exhaustive;
        }
    }
}

const HOOK_HANDLERS: Record<HookEvent, HookHandler> = {
    'prompt-gate': promptGate,
};

function isHookEvent(event: string): event is HookEvent {
    return (HOOK_EVENTS as readonly string[]).includes(event);
}

async function readStdin(source: string | NodeJS.ReadableStream): Promise<string> {
    if (typeof source === 'string') return source;
    if ((source as { isTTY?: boolean }).isTTY) return '';
    const chunks: Buffer[] = [];
    for await (const chunk of source) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
}

/** The payload object, or null when stdin is empty or not a JSON object. */
export function parseHookInput(raw: string): HookInput | null {
    if (!raw.trim()) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as HookInput)
            : null;
    } catch {
        return null;
    }
}

/**
 * Run one hook event. Returns the process exit code, always 0: a hook must
 * never fail a prompt or tool call because rulebook could not decide.
 * Project root: `CLAUDE_PROJECT_DIR` (set by Claude Code for every hook),
 * else the payload's `cwd`, else `options.cwd`, else the process cwd.
 */
export async function hookCommand(
    event: string,
    options: HookCommandOptions = {}
): Promise<number> {
    const env = options.env ?? process.env;
    const log = options.log ?? ((line: string) => void process.stdout.write(line + '\n'));
    try {
        if (!isHookEvent(event)) return 0;
        const input = parseHookInput(await readStdin(options.stdin ?? process.stdin));
        if (!input) return 0;
        const projectRoot =
            env.CLAUDE_PROJECT_DIR?.trim() ||
            (typeof input.cwd === 'string' && input.cwd.trim()) ||
            options.cwd ||
            process.cwd();
        const ctx: HookContext = {
            projectRoot,
            env,
            fetch: options.fetch,
            config: await readConfigFile(projectRoot),
        };
        const output = await HOOK_HANDLERS[event](input, ctx);
        if (output) log(JSON.stringify(output));
    } catch {
        // fail-open: no output
    }
    return 0;
}
