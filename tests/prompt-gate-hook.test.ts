import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { hookCommand, parseHookInput } from '../src/cli/commands/hook';
import {
    promptHookAnswer,
    promptHookTimeoutSec,
    resolvePromptHookConfig,
    resolveScopeConfig,
    PROMPT_HOOK_CONTEXT_MAX_BYTES,
    PROMPT_HOOK_HEADER,
} from '../src/core/typesafe/prompt-hook';
import { OFF_TOPIC_SENTENCE, type GateResult } from '../src/core/typesafe/gate';
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
            inProjectScope: null,
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

describe('promptHookAnswer — project scope', () => {
    const DESC =
        'CLI that standardises AI agent rules across Claude Code, Cursor, Gemini, Codex and more tools';
    const ASK = { offTopicBelow: 0.15, onOffTopic: 'ask' as const, description: DESC };
    const BLOCK = { ...ASK, onOffTopic: 'block' as const };

    /** A result whose `in_project_scope` answer is `p` (plus optional risks). */
    function scoped(p: number, risks: Partial<Record<string, number>> = {}, instruction?: string) {
        const r = gateResult(
            risks,
            instruction ?? `Jev routing: kind=small-fix. ${OFF_TOPIC_SENTENCE}`
        );
        r.decisions.push({
            id: 'in_project_scope',
            primitive: 'noul',
            answer: p >= 0.7 ? true : p <= 0.3 ? false : null,
            probability: p,
            decided: p >= 0.7 || p <= 0.3,
        });
        r.routing.inProjectScope = p >= 0.7 ? true : p <= 0.3 ? false : null;
        return r;
    }

    it('resolveScopeConfig: defaults ask / 0.15, clamps to 0–0.3', () => {
        expect(resolveScopeConfig(null)).toEqual({ offTopicBelow: 0.15, onOffTopic: 'ask' });
        expect(
            resolveScopeConfig({ gate: { scope: { offTopicBelow: 0.9, onOffTopic: 'block' } } })
        ).toEqual({ offTopicBelow: 0.3, onOffTopic: 'block' });
        expect(resolveScopeConfig({ gate: { scope: { offTopicBelow: -1 } } }).offTopicBelow).toBe(
            0
        );
    });

    it('off-topic ≤ offTopicBelow, ask → context begins with the confirm line', () => {
        const a = promptHookAnswer(scoped(0.05), { blockThreshold: 0.9 }, ASK);
        expect(a.kind).toBe('context');
        if (a.kind !== 'context') return;
        const lines = a.additionalContext.split('\n');
        expect(lines[0]).toMatch(
            /^Confirm with the operator before acting: this prompt looks unrelated to this project "CLI that/
        );
        expect(lines[0]).toContain(`"${DESC.slice(0, 80)}…"`);
        expect(lines[1]).toBe(PROMPT_HOOK_HEADER);
        // The gate's generic sentence is replaced, not repeated.
        expect(a.additionalContext).not.toContain(OFF_TOPIC_SENTENCE);
        expect(a.additionalContext).not.toMatch(/Warning: possibly off-topic/);
    });

    it('ask mode stays within 1024 bytes and keeps the confirm line first', () => {
        const a = promptHookAnswer(
            scoped(0.05, { risk_secrets: 0.9 }, 'Jev routing: ' + 'ü'.repeat(2000)),
            { blockThreshold: 0.9 },
            ASK
        );
        expect(a.kind).toBe('context');
        if (a.kind !== 'context') return;
        expect(Buffer.byteLength(a.additionalContext)).toBeLessThanOrEqual(
            PROMPT_HOOK_CONTEXT_MAX_BYTES
        );
        expect(a.additionalContext.startsWith('Confirm with the operator before acting')).toBe(
            true
        );
        expect(a.additionalContext).toMatch(/Warning: secrets/);
    });

    it('off-topic ≤ offTopicBelow, block → block naming the project and gate.scope.onOffTopic', () => {
        const a = promptHookAnswer(scoped(0.05), { blockThreshold: 0.9 }, BLOCK);
        expect(a.kind).toBe('block');
        if (a.kind !== 'block') return;
        expect(a.reason).toContain(DESC.slice(0, 80));
        expect(a.reason).toContain('gate.scope.onOffTopic');
    });

    it('borderline (between offTopicBelow and 0.3) → warning line only, even in block mode', () => {
        for (const scope of [ASK, BLOCK]) {
            const a = promptHookAnswer(scoped(0.2), { blockThreshold: 0.9 }, scope);
            expect(a.kind).toBe('context');
            if (a.kind !== 'context') return;
            expect(a.additionalContext.startsWith(PROMPT_HOOK_HEADER)).toBe(true);
            expect(a.additionalContext).toMatch(
                /Warning: possibly off-topic for this project .*p=0\.20/
            );
            expect(a.additionalContext).not.toMatch(/Confirm with the operator/i);
        }
    });

    it('on-topic or undecided scope → plain routing', () => {
        for (const p of [0.92, 0.5]) {
            const a = promptHookAnswer(
                scoped(p, {}, 'Jev routing: x.'),
                { blockThreshold: 0.9 },
                BLOCK
            );
            expect(a).toEqual({
                kind: 'context',
                additionalContext: `${PROMPT_HOOK_HEADER}\nJev routing: x.`,
            });
        }
    });

    it('no description (no scope argument) → never blocks or asks on scope', () => {
        const a = promptHookAnswer(scoped(0.01), { blockThreshold: 0.9 });
        expect(a.kind).toBe('context');
        if (a.kind !== 'context') return;
        expect(a.additionalContext.startsWith(PROMPT_HOOK_HEADER)).toBe(true);
        expect(a.additionalContext).not.toMatch(/Confirm with the operator before acting:/);
    });

    it('an OS-scheduling block still wins over a scope block', () => {
        const a = promptHookAnswer(
            scoped(0.01, { risk_os_scheduling: 0.95 }),
            { blockThreshold: 0.9 },
            BLOCK
        );
        expect(a.kind).toBe('block');
        if (a.kind !== 'block') return;
        expect(a.reason).toMatch(/OS-level scheduling/);
        expect(a.reason).not.toContain('gate.scope.onOffTopic');
    });
});

describe('rulebook hook prompt-gate', () => {
    let root: string;

    // The gate imports its task sources lazily. Under vitest the first import
    // is an on-demand transform that, on a loaded machine, can outlast a short
    // deadline — load them before any test's clock starts.
    beforeAll(async () => {
        await import('../src/core/tasks/task-manager');
        await import('../src/core/tasks/learn-manager');
    });

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

    it('an answer arriving after the deadline is never logged late', async () => {
        await writeConfig({
            gate: { promptHook: { deadlineMs: 1000 } },
            features: { logging: true },
        });
        // A fetch that ignores its abort signal and answers only when released.
        let release: () => void = () => undefined;
        const late = vi.fn(
            (_url: string, init: RequestInit) =>
                new Promise<Response>((resolve) => {
                    const req = JSON.parse(init.body as string);
                    release = () =>
                        resolve(
                            new Response(
                                JSON.stringify({
                                    model: 'jev-1.13.0',
                                    answers: answersFor(req.questions),
                                    usage: { input_tokens: 1, output_tokens: 1 },
                                }),
                                { status: 200 }
                            )
                        );
                })
        );
        const { code, lines } = await run('secret prompt text', { fetch: late });
        expect({ code, lines }).toEqual({ code: 0, lines: [] });
        expect(late).toHaveBeenCalledTimes(1);

        const logFile = path.join(root, '.rulebook', 'logs', 'gate.jsonl');
        const before = await fs.readFile(logFile, 'utf-8').catch(() => '');
        const filesBefore = (await fs.readdir(root, { recursive: true })).sort();
        release();
        await new Promise((r) => setTimeout(r, 200));
        expect(await fs.readFile(logFile, 'utf-8').catch(() => '')).toBe(before);
        expect((await fs.readdir(root, { recursive: true })).sort()).toEqual(filesBefore);

        const entries = before
            .trim()
            .split('\n')
            .filter(Boolean)
            .map((l) => JSON.parse(l));
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({ source: 'hook', available: false, reason: 'timeout' });
        expect(before).not.toContain('secret prompt text');
        expect(before).not.toContain(FAKE_KEY);
    });

    async function writeDescription(description: string) {
        await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ description }));
    }

    it('off-topic prompt, ask mode (default) → context begins with the confirm line', async () => {
        await writeDescription('CLI that standardises AI agent rules');
        const fetchMock = jevFetch({ in_project_scope: { noul: 0.05 } });
        const { code, lines } = await run('write me a cover letter for a marketing job', {
            fetch: fetchMock,
        });
        expect(code).toBe(0);
        const out = JSON.parse(lines[0]);
        expect(out.decision).toBeUndefined();
        const ctx: string = out.hookSpecificOutput.additionalContext;
        expect(ctx).toMatch(
            /^Confirm with the operator before acting: this prompt looks unrelated to this project "CLI that standardises AI agent rules"/
        );
        expect(Buffer.byteLength(ctx)).toBeLessThanOrEqual(1024);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
        expect(body.state.project.description).toBe('CLI that standardises AI agent rules');
    });

    it('off-topic prompt, block mode → decision block naming gate.scope.onOffTopic', async () => {
        await writeDescription('CLI that standardises AI agent rules');
        await writeConfig({ gate: { scope: { onOffTopic: 'block' } } });
        const { code, lines } = await run('write me a cover letter', {
            fetch: jevFetch({ in_project_scope: { noul: 0.05 } }),
        });
        expect(code).toBe(0);
        const out = JSON.parse(lines[0]);
        expect(out.decision).toBe('block');
        expect(out.reason).toContain('CLI that standardises AI agent rules');
        expect(out.reason).toContain('gate.scope.onOffTopic');
    });

    it('borderline scope (0.2) → warning line only, no block', async () => {
        await writeDescription('CLI that standardises AI agent rules');
        await writeConfig({ gate: { scope: { onOffTopic: 'block' } } });
        const { lines } = await run('tidy my desktop', {
            fetch: jevFetch({ in_project_scope: { noul: 0.2 } }),
        });
        const out = JSON.parse(lines[0]);
        expect(out.decision).toBeUndefined();
        const ctx: string = out.hookSpecificOutput.additionalContext;
        expect(ctx.startsWith('Jev routing (rulebook prompt hook)')).toBe(true);
        expect(ctx).toMatch(/Warning: possibly off-topic/);
        expect(ctx).not.toMatch(/confirm with the operator/i);
    });

    it('OS-scheduling block wins over an off-topic block', async () => {
        await writeDescription('CLI that standardises AI agent rules');
        await writeConfig({ gate: { scope: { onOffTopic: 'block' } } });
        const { lines } = await run('add a crontab entry for my home backup', {
            fetch: jevFetch({
                in_project_scope: { noul: 0.05 },
                risk_os_scheduling: { noul: 0.95 },
            }),
        });
        const out = JSON.parse(lines[0]);
        expect(out.decision).toBe('block');
        expect(out.reason).toMatch(/OS-level scheduling/);
    });

    it('no project description → the scope question is not sent and nothing blocks on scope', async () => {
        await writeConfig({ gate: { scope: { onOffTopic: 'block' } } });
        const fetchMock = jevFetch({ in_project_scope: { noul: 0.01 } });
        const { lines } = await run('write me a cover letter', { fetch: fetchMock });
        const out = JSON.parse(lines[0]);
        expect(out.decision).toBeUndefined();
        expect(out.hookSpecificOutput.additionalContext).not.toMatch(/off-topic|unrelated/i);
        const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
        expect(Object.keys(body.questions)).not.toContain('in_project_scope');
    });

    it('Jev unavailable (no key) with a description → no output', async () => {
        await writeDescription('CLI that standardises AI agent rules');
        const { code, lines } = await run('write me a cover letter', { env: {}, fetch: vi.fn() });
        expect(code).toBe(0);
        expect(lines).toEqual([]);
    });

    it('parseHookInput accepts only JSON objects', () => {
        expect(parseHookInput('{"prompt":"x"}')).toEqual({ prompt: 'x' });
        expect(parseHookInput('null')).toBeNull();
        expect(parseHookInput('')).toBeNull();
    });
});
