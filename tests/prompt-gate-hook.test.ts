import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { hookCommand, parseHookInput } from '../src/cli/commands/hook';
import {
    promptHookAnswer,
    promptHookTimeoutSec,
    resolvePromptHookConfig,
    PROMPT_HOOK_CONTEXT_MAX_BYTES,
    PROMPT_HOOK_HEADER,
} from '../src/core/typesafe/prompt-hook';
import type { GateResult } from '../src/core/typesafe/gate';
import type { Question } from '../src/core/typesafe/client';

const FAKE_KEY = 'ts_fake_hook_key_000';
const KEY_ENV = { TYPESAFE_API_KEY: FAKE_KEY };

type Overrides = Record<string, { choice?: string; confidence?: number; noul?: number }>;

/** A System One answer for every question in the request body, with overrides. */
function answersFor(questions: Record<string, Question>, over: Overrides = {}) {
    const answers: Record<string, unknown> = {};
    for (const [id, q] of Object.entries(questions)) {
        const o = over[id] ?? {};
        if (q.type === 'choice') {
            const keys = Object.keys(q.criteria);
            const choice = o.choice ?? keys[0];
            const probabilities: Record<string, number> = {};
            for (const k of keys) probabilities[k] = k === choice ? 0.9 : 0.1 / (keys.length - 1);
            answers[id] = {
                type: 'choice',
                choice,
                confidence: o.confidence ?? 0.9,
                probabilities,
            };
        } else {
            answers[id] = { type: 'noul', noul: o.noul ?? 0.05 };
        }
    }
    return answers;
}

function jevFetch(over: Overrides = {}) {
    return vi.fn(async (_url: string, init: RequestInit) => {
        const req = JSON.parse(init.body as string);
        return new Response(
            JSON.stringify({
                model: 'jev-1.13.0',
                answers: answersFor(req.questions, over),
                usage: { input_tokens: 2000, output_tokens: 150 },
            }),
            { status: 200 }
        );
    });
}

function gateResult(
    risks: Partial<Record<string, number>>,
    instruction = 'Jev routing: x.'
): GateResult {
    return {
        available: true,
        decisions: Object.entries(risks).map(([id, p]) => ({
            id,
            primitive: 'noul' as const,
            answer: (p ?? 0) >= 0.5,
            probability: p ?? 0,
            decided: true,
        })),
        routing: {
            kind: 'small-fix',
            needsTask: false,
            existingTaskId: null,
            model: 'opus',
            agentType: 'implementer',
            skill: null,
            parallel: false,
            needsOperatorDecision: false,
            risk: { destructiveGit: false, osScheduling: false, secrets: false },
        },
        undecided: [],
        instruction,
        elapsedMs: 1,
        stateBytes: 1,
    };
}

describe('resolvePromptHookConfig', () => {
    it('applies defaults', () => {
        expect(resolvePromptHookConfig(null)).toEqual({
            enabled: true,
            deadlineMs: 5000,
            blockThreshold: 0.9,
        });
    });

    it('clamps deadline to 1000–8500 ms and threshold to 0.5–1', () => {
        const low = resolvePromptHookConfig({
            gate: { promptHook: { deadlineMs: 10, blockThreshold: 0.1 } },
        });
        expect(low).toMatchObject({ deadlineMs: 1000, blockThreshold: 0.5 });
        const high = resolvePromptHookConfig({
            gate: { promptHook: { deadlineMs: 60_000, blockThreshold: 3 } },
        });
        expect(high).toMatchObject({ deadlineMs: 8500, blockThreshold: 1 });
    });

    it('is off when turned off or when TypeSafe is opted out', () => {
        expect(resolvePromptHookConfig({ gate: { promptHook: { enabled: false } } }).enabled).toBe(
            false
        );
        expect(
            resolvePromptHookConfig({ integrations: { typesafe: { enabled: false } } }).enabled
        ).toBe(false);
    });

    it('timeout outlives the deadline', () => {
        expect(promptHookTimeoutSec(5000)).toBe(8);
        expect(promptHookTimeoutSec(8500)).toBe(12);
    });
});

describe('promptHookAnswer', () => {
    it('unavailable → none', () => {
        expect(
            promptHookAnswer({ ...gateResult({}), available: false }, { blockThreshold: 0.9 })
        ).toEqual({ kind: 'none' });
    });

    it('OS scheduling at or above the threshold → block naming the rule and the switch', () => {
        const a = promptHookAnswer(gateResult({ risk_os_scheduling: 0.95 }), {
            blockThreshold: 0.9,
        });
        expect(a.kind).toBe('block');
        if (a.kind !== 'block') return;
        expect(a.reason).toMatch(/OS-level scheduling/);
        expect(a.reason).toContain('gate.promptHook.enabled');
    });

    it('OS scheduling below the threshold → warning, no block', () => {
        const a = promptHookAnswer(gateResult({ risk_os_scheduling: 0.6 }), {
            blockThreshold: 0.9,
        });
        expect(a.kind).toBe('context');
        if (a.kind !== 'context') return;
        expect(a.additionalContext).toMatch(/Warning: OS-level scheduling \(p=0\.60\)/);
    });

    it('destructive git and secrets never block; they warn', () => {
        const a = promptHookAnswer(
            gateResult({ risk_destructive_git: 0.98, risk_secrets: 0.99, risk_os_scheduling: 0.1 }),
            { blockThreshold: 0.5 }
        );
        expect(a.kind).toBe('context');
        if (a.kind !== 'context') return;
        expect(a.additionalContext).toMatch(/Warning: destructive git .*Git safety/);
        expect(a.additionalContext).toMatch(/Warning: secrets/);
        expect(a.additionalContext).not.toMatch(/OS-level/);
    });

    it('caps the context at 1024 bytes and keeps the header and warnings', () => {
        const a = promptHookAnswer(
            gateResult({ risk_secrets: 0.9 }, 'Jev routing: ' + 'ü'.repeat(2000)),
            { blockThreshold: 0.9 }
        );
        expect(a.kind).toBe('context');
        if (a.kind !== 'context') return;
        expect(Buffer.byteLength(a.additionalContext)).toBeLessThanOrEqual(
            PROMPT_HOOK_CONTEXT_MAX_BYTES
        );
        expect(a.additionalContext.startsWith(PROMPT_HOOK_HEADER)).toBe(true);
        expect(a.additionalContext).toMatch(/Warning: secrets/);
        expect(a.additionalContext).not.toContain('�');
    });
});

describe('rulebook hook prompt-gate', () => {
    let root: string;

    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), 'rb-prompt-hook-'));
    });

    afterEach(async () => {
        await fs.rm(root, { recursive: true, force: true });
    });

    async function writeConfig(cfg: Record<string, unknown>) {
        await fs.mkdir(path.join(root, '.rulebook'), { recursive: true });
        await fs.writeFile(path.join(root, '.rulebook', 'rulebook.json'), JSON.stringify(cfg));
    }

    async function run(
        prompt: string | undefined,
        opts: { env?: NodeJS.ProcessEnv; fetch?: unknown; stdin?: string; event?: string } = {}
    ) {
        const lines: string[] = [];
        const stdin =
            opts.stdin ??
            JSON.stringify({ hook_event_name: 'UserPromptSubmit', cwd: root, prompt });
        const code = await hookCommand(opts.event ?? 'prompt-gate', {
            stdin,
            env: opts.env ?? KEY_ENV,
            fetch: opts.fetch as typeof fetch,
            log: (l) => lines.push(l),
        });
        return { code, lines };
    }

    it('normal prompt → UserPromptSubmit additionalContext with the routing', async () => {
        const fetchMock = jevFetch({ kind: { choice: 'task_work' } });
        const { code, lines } = await run('add a --json flag to rulebook task list', {
            fetch: fetchMock,
        });
        expect(code).toBe(0);
        expect(lines).toHaveLength(1);
        const out = JSON.parse(lines[0]);
        expect(out.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
        const ctx: string = out.hookSpecificOutput.additionalContext;
        expect(ctx.startsWith('Jev routing (rulebook prompt hook)')).toBe(true);
        expect(ctx).toMatch(/Jev routing: kind=task-work/);
        expect(ctx).not.toMatch(/Warning/);
        expect(Buffer.byteLength(ctx)).toBeLessThanOrEqual(1024);
        expect(lines[0]).not.toContain(FAKE_KEY);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('OS-scheduling request ≥ threshold → decision block, exit 0', async () => {
        const { code, lines } = await run('add a crontab entry that runs the backup every night', {
            fetch: jevFetch({ risk_os_scheduling: { noul: 0.95 } }),
        });
        expect(code).toBe(0);
        const out = JSON.parse(lines[0]);
        expect(out.decision).toBe('block');
        expect(out.reason).toMatch(/OS-level scheduling/);
        expect(out.reason).toContain('gate.promptHook.enabled');
    });

    it('honours a configured blockThreshold', async () => {
        await writeConfig({ gate: { promptHook: { blockThreshold: 0.99 } } });
        const { lines } = await run('schedule a nightly job', {
            fetch: jevFetch({ risk_os_scheduling: { noul: 0.95 } }),
        });
        const out = JSON.parse(lines[0]);
        expect(out.decision).toBeUndefined();
        expect(out.hookSpecificOutput.additionalContext).toMatch(/Warning: OS-level scheduling/);
    });

    it('destructive git / secrets → warnings, never a block', async () => {
        const { lines } = await run('force-push my feature branch and print the API key', {
            fetch: jevFetch({
                risk_destructive_git: { noul: 0.98 },
                risk_secrets: { noul: 0.9 },
            }),
        });
        const out = JSON.parse(lines[0]);
        expect(out.decision).toBeUndefined();
        const ctx: string = out.hookSpecificOutput.additionalContext;
        expect(ctx).toMatch(/destructive git.*Git safety/);
        expect(ctx).toMatch(/Warning: secrets/);
    });

    it('no key → no output and no network call', async () => {
        const fetchMock = vi.fn();
        const { code, lines } = await run('anything', { env: {}, fetch: fetchMock });
        expect(code).toBe(0);
        expect(lines).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('RULEBOOK_GATE=off → no output', async () => {
        const fetchMock = vi.fn();
        const { lines } = await run('anything', {
            env: { ...KEY_ENV, RULEBOOK_GATE: 'off' },
            fetch: fetchMock,
        });
        expect(lines).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('gate.promptHook.enabled:false → no output', async () => {
        await writeConfig({ gate: { promptHook: { enabled: false } } });
        const fetchMock = vi.fn();
        const { lines } = await run('anything', { fetch: fetchMock });
        expect(lines).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('TypeSafe opted out → no output', async () => {
        await writeConfig({ integrations: { typesafe: { enabled: false } } });
        const fetchMock = vi.fn();
        const { lines } = await run('anything', { fetch: fetchMock });
        expect(lines).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('slow Jev → no output within about the deadline', async () => {
        await writeConfig({ gate: { promptHook: { deadlineMs: 1000 } } });
        const never = vi.fn(() => new Promise<Response>(() => {}));
        const t0 = Date.now();
        const { code, lines } = await run('anything', { fetch: never });
        const elapsed = Date.now() - t0;
        expect(code).toBe(0);
        expect(lines).toEqual([]);
        expect(elapsed).toBeLessThan(2500);
    });

    it('HTTP error → no output', async () => {
        const fail = vi.fn(async () => new Response('{}', { status: 500 }));
        const { code, lines } = await run('anything', { fetch: fail });
        expect(code).toBe(0);
        expect(lines).toEqual([]);
    });

    it('bad stdin, empty prompt, unknown event → no output, exit 0', async () => {
        for (const stdin of ['', 'not json', '[1,2]', '"text"']) {
            const r = await run(undefined, { stdin, fetch: vi.fn() });
            expect(r).toEqual({ code: 0, lines: [] });
        }
        expect(await run('   ', { fetch: vi.fn() })).toEqual({ code: 0, lines: [] });
        expect(await run('hi', { event: 'nope', fetch: vi.fn() })).toEqual({ code: 0, lines: [] });
        expect(await run('hi', { event: 'constructor', fetch: vi.fn() })).toEqual({
            code: 0,
            lines: [],
        });
    });

    it('a throwing fetch still exits 0 with no output', async () => {
        const boom = vi.fn(async () => {
            throw new Error('boom');
        });
        const { code, lines } = await run('anything', { fetch: boom });
        expect(code).toBe(0);
        expect(lines).toEqual([]);
    });

    it('logs source:"hook" when features.logging is on', async () => {
        await writeConfig({ features: { logging: true } });
        await run('secret prompt text', { fetch: jevFetch() });
        const raw = await fs.readFile(path.join(root, '.rulebook', 'logs', 'gate.jsonl'), 'utf-8');
        expect(JSON.parse(raw.trim()).source).toBe('hook');
        expect(raw).not.toContain('secret prompt text');
        expect(raw).not.toContain(FAKE_KEY);
    });

    it('parseHookInput accepts only JSON objects', () => {
        expect(parseHookInput('{"prompt":"x"}')).toEqual({ prompt: 'x' });
        expect(parseHookInput('null')).toBeNull();
        expect(parseHookInput('')).toBeNull();
    });
});
