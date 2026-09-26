import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { z } from 'zod';
import {
    buildGateState,
    buildGateQuestions,
    interpretAnswers,
    runGate,
    stateBytes,
    STATE_CAPS,
    TRUNCATION_MARKER,
    type GateSources,
} from '../src/core/typesafe/gate';
import type { Question } from '../src/core/typesafe/client';
import { registerV7Tools } from '../src/mcp/tools/v7-tools';
import { ConfigManager } from '../src/core/state/config-manager';
import { resolveTaskBackend } from '../src/core/tasks/task-manager';
import type { ToolContext } from '../src/mcp/tools/context';

const FAKE_KEY = 'ts_fake_gate_key_000';
const KEY_ENV = { TYPESAFE_API_KEY: FAKE_KEY };

const TASKS = [
    { id: 'phase1_login', title: 'Add login', status: 'in-progress' },
    {
        id: 'phase2_docs',
        title: 'Docs pass',
        status: 'blocked',
        questions: [{ id: 'q1', question: 'Which docs tool?', status: 'open' }],
    },
];

function sources(over: Partial<GateSources> = {}): GateSources {
    return {
        config: {
            projectId: 'demo',
            version: '7.4.0',
            skills: { enabled: ['languages/typescript'] },
        },
        tasks: TASKS,
        skillCandidates: [],
        promotedSkills: [],
        ...over,
    };
}

type Overrides = Record<string, { choice?: string; confidence?: number; noul?: number }>;

/** A System One answer for every question in the request body, with overrides. */
function answersFor(questions: Record<string, Question>, over: Overrides = {}) {
    const answers: Record<string, unknown> = {};
    for (const [id, q] of Object.entries(questions)) {
        const o = over[id] ?? {};
        if (q.type === 'choice') {
            const keys = Object.keys(q.criteria);
            const choice = o.choice ?? keys[0];
            const confidence = o.confidence ?? 0.9;
            const probabilities: Record<string, number> = {};
            for (const k of keys) probabilities[k] = k === choice ? 0.9 : 0.1 / (keys.length - 1);
            answers[id] = { type: 'choice', choice, confidence, probabilities };
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

describe('gate state', () => {
    it('describes the project, tasks, open questions, skills, agents and routing', () => {
        const s = buildGateState(sources(), 'fix the login bug', 'pick the model');
        expect(s.project).toMatchObject({ id: 'demo', version: '7.4.0', tasksBackend: 'files' });
        expect(s.tasks.active).toEqual({ id: 'phase1_login', status: 'in-progress' });
        expect(s.tasks.list.map((t) => t.id)).toEqual(['phase1_login', 'phase2_docs']);
        expect(s.openQuestions).toEqual([
            { taskId: 'phase2_docs', id: 'q1', question: 'Which docs tool?' },
        ]);
        expect(s.skills).toEqual(['languages/typescript']);
        expect(s.agents).toContain('implementer');
        expect(s.routing.opus).toMatch(/default for simple work/);
        expect(s.prompt).toBe('fix the login bug');
        expect(s.notes).toBe('pick the model');
    });

    it('caps lists and truncates a long prompt with the marker', () => {
        const tasks = Array.from({ length: 30 }, (_, i) => ({
            id: `phase1_t${i}`,
            title: 'x'.repeat(200),
            status: 'pending',
        }));
        const s = buildGateState(
            sources({
                tasks,
                promotedSkills: Array.from({ length: 40 }, (_, i) => `skill-${i}`),
            }),
            'p'.repeat(10_000)
        );
        expect(s.tasks.list.length).toBeLessThanOrEqual(STATE_CAPS.tasks);
        expect(s.tasks.list[0].title.length).toBeLessThanOrEqual(STATE_CAPS.taskTitle);
        expect(s.skills.length).toBeLessThanOrEqual(STATE_CAPS.skills);
        expect(s.prompt.endsWith(TRUNCATION_MARKER)).toBe(true);
        expect(stateBytes(s)).toBeLessThanOrEqual(STATE_CAPS.hardBytes);
    });

    it('trims in order (notes first) when over the soft budget', () => {
        // 4000 two-byte chars: ~8 KB of prompt forces every trim step.
        const s = buildGateState(sources(), 'é'.repeat(4000), 'n'.repeat(1000));
        expect(s.notes).toBeUndefined();
        expect(s.prompt.length).toBe(STATE_CAPS.promptTrimmed + TRUNCATION_MARKER.length);
        expect(stateBytes(s)).toBeLessThanOrEqual(STATE_CAPS.hardBytes);
    });

    it('enforces the 8 KB hard cap by bytes, never splitting a 4-byte code point', () => {
        // Long task ids are not clipped, so after every trim the state is still
        // over 8 KB; only a byte-level cut of the prompt brings it under.
        const tasks = Array.from({ length: 8 }, (_, i) => ({
            id: `phase1_${String(i).padStart(2, '0')}_${'x'.repeat(500)}`,
            title: 'long id',
            status: 'pending',
        }));
        const s = buildGateState(sources({ tasks }), '😀'.repeat(3000));
        expect(stateBytes(s)).toBeLessThanOrEqual(STATE_CAPS.hardBytes);
        expect(s.prompt.endsWith(TRUNCATION_MARKER)).toBe(true);
        const body = s.prompt.slice(0, -TRUNCATION_MARKER.length);
        expect(body.length).toBeGreaterThan(0);
        expect(body).toMatch(/^(?:😀)+$/u);
        expect(body).not.toContain('�');
        // Still fits the budget closely: one more emoji would overflow.
        expect(stateBytes(s) + 4).toBeGreaterThan(STATE_CAPS.hardBytes);
    });

    it('omits existing_task and skill questions when their lists are empty', () => {
        const empty = buildGateState(
            sources({ tasks: [], config: { projectId: 'demo' } }),
            'hello'
        );
        const q = buildGateQuestions(empty);
        expect(q.existing_task).toBeUndefined();
        expect(q.skill).toBeUndefined();
        expect(Object.keys(q)).toHaveLength(9);

        const full = buildGateQuestions(buildGateState(sources(), 'hello'));
        expect(Object.keys(full)).toHaveLength(11);
        expect(full.existing_task).toMatchObject({
            criteria: { phase1_login: 'Add login (in-progress)', none: expect.any(String) },
        });
        expect(full.skill).toMatchObject({
            criteria: { 'languages/typescript': 'languages typescript' },
        });
    });
});

describe('gate interpretation', () => {
    const state = buildGateState(sources(), 'fix it');
    const questions = buildGateQuestions(state);

    it('fills routing from decided answers', () => {
        const r = interpretAnswers(
            questions,
            {
                answers: answersFor(questions, {
                    kind: { choice: 'task_work' },
                    needs_task: { noul: 0.9 },
                    existing_task: { choice: 'phase1_login' },
                    model: { choice: 'opus' },
                    agent: { choice: 'implementer' },
                    skill: { choice: 'languages/typescript' },
                    parallel: { noul: 0.1 },
                    needs_operator_decision: { noul: 0.2 },
                    risk_secrets: { noul: 0.5 },
                }) as never,
            },
            state
        );
        expect(r.routing).toEqual({
            kind: 'task-work',
            needsTask: true,
            existingTaskId: 'phase1_login',
            model: 'opus',
            agentType: 'implementer',
            skill: 'languages/typescript',
            parallel: false,
            needsOperatorDecision: false,
            risk: { destructiveGit: false, osScheduling: false, secrets: true },
        });
        expect(r.undecided).toEqual([]);
        expect(r.decisions).toHaveLength(11);
    });

    it('lists undecided ids and leaves their fields null', () => {
        const r = interpretAnswers(
            questions,
            {
                answers: answersFor(questions, {
                    kind: { confidence: 0.4 },
                    parallel: { noul: 0.5 },
                    agent: { choice: 'none' },
                    model: { confidence: 0.3 },
                }) as never,
            },
            state
        );
        expect(r.routing.kind).toBeNull();
        expect(r.routing.parallel).toBeNull();
        expect(r.routing.model).toBeNull();
        expect(r.undecided).toEqual(expect.arrayContaining(['kind', 'parallel', 'model']));
        const kind = r.decisions.find((d) => d.id === 'kind')!;
        expect(kind.decided).toBe(false);
        expect(kind.answer).toBe('small_fix'); // the lean is still reported
    });

    it('applies post-rules: small_fix ⇒ no task; model derived from agent', () => {
        const r = interpretAnswers(
            questions,
            {
                answers: answersFor(questions, {
                    kind: { choice: 'small_fix' },
                    needs_task: { noul: 0.9 },
                    existing_task: { choice: 'none' },
                    model: { confidence: 0.2 },
                    agent: { choice: 'code-reviewer' },
                }) as never,
            },
            state
        );
        expect(r.routing.needsTask).toBe(false);
        expect(r.routing.model).toBe('fable');
        expect(r.derived).toContain('model');
        expect(r.undecided).not.toContain('model');
    });

    it('treats a choice outside the criteria as undecided', () => {
        const r = interpretAnswers(
            questions,
            {
                answers: answersFor(questions, {
                    agent: { choice: 'wizard' },
                    model: { choice: 'gpt' },
                    existing_task: { choice: 'phase9_ghost' },
                }) as never,
            },
            state
        );
        expect(r.routing.agentType).toBeNull();
        expect(r.routing.model).toBeNull();
        expect(r.routing.existingTaskId).toBeNull();
        expect(r.undecided).toEqual(expect.arrayContaining(['agent', 'model', 'existing_task']));
        const agent = r.decisions.find((d) => d.id === 'agent')!;
        expect(agent).toMatchObject({ decided: false, answer: null });
    });

    it('answer_to_open_question with no decided task picks the owner of the first open question', () => {
        const r = interpretAnswers(
            questions,
            {
                answers: answersFor(questions, {
                    kind: { choice: 'answer_to_open_question' },
                    existing_task: { confidence: 0.1 },
                }) as never,
            },
            state
        );
        expect(r.routing.existingTaskId).toBe('phase2_docs');
        expect(r.routing.needsTask).toBe(true);
    });
});

describe('runGate', () => {
    let root: string;

    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), 'rb-gate-'));
    });

    afterEach(async () => {
        await fs.rm(root, { recursive: true, force: true });
    });

    async function writeConfig(cfg: Record<string, unknown>) {
        await fs.mkdir(path.join(root, '.rulebook'), { recursive: true });
        await fs.writeFile(path.join(root, '.rulebook', 'rulebook.json'), JSON.stringify(cfg));
    }

    it('returns a decided routing from a canned Jev response', async () => {
        const fetchMock = jevFetch({ kind: { choice: 'question_or_analysis' } });
        const r = await runGate({
            projectRoot: root,
            prompt: 'explain the retry logic',
            env: KEY_ENV,
            fetch: fetchMock as never,
            listTasks: async () => [],
        });
        expect(r.available).toBe(true);
        expect(r.model).toBe('jev-1.13.0');
        expect(r.routing.kind).toBe('question-or-analysis');
        expect(r.routing.existingTaskId).toBeNull();
        expect(r.routing.skill).toBeNull();
        expect(r.usage).toEqual({ input_tokens: 2000, output_tokens: 150 });
        expect(r.stateBytes).toBeGreaterThan(0);
        expect(r.elapsedMs).toBeGreaterThanOrEqual(0);
        expect(r.instruction).toMatch(/^Jev routing: kind=question-or-analysis/);
        expect(JSON.stringify(r)).not.toContain(FAKE_KEY);
        const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
        expect(Object.keys(body.questions)).not.toContain('existing_task');
        expect(body.state.prompt).toBe('explain the retry logic');
    });

    it('RULEBOOK_GATE=off → disabled, no network', async () => {
        const fetchMock = vi.fn();
        const r = await runGate({
            projectRoot: root,
            prompt: 'x',
            env: { ...KEY_ENV, RULEBOOK_GATE: 'off' },
            fetch: fetchMock as never,
        });
        expect(r).toMatchObject({ available: false, reason: 'disabled' });
        expect(r.instruction).toMatch(/CLAUDE\.md Orchestration rules/);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('integrations.typesafe.enabled:false → disabled', async () => {
        await writeConfig({ integrations: { typesafe: { enabled: false } } });
        const fetchMock = vi.fn();
        const r = await runGate({
            projectRoot: root,
            prompt: 'x',
            env: KEY_ENV,
            fetch: fetchMock as never,
        });
        expect(r.reason).toBe('disabled');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('no key → unavailable with instructions once per process', async () => {
        vi.resetModules();
        const fresh = await import('../src/core/typesafe/gate');
        const first = await fresh.runGate({ projectRoot: root, prompt: 'x', env: {} });
        const second = await fresh.runGate({ projectRoot: root, prompt: 'x', env: {} });
        expect(first).toMatchObject({ available: false, reason: 'no-key' });
        expect(first.instructions?.join('\n')).toMatch(/TYPESAFE_API_KEY/);
        expect(second.reason).toBe('no-key');
        expect(second.instructions).toBeUndefined();
        const cli = await fresh.runGate({
            projectRoot: root,
            prompt: 'x',
            env: {},
            alwaysShowInstructions: true,
        });
        expect(cli.instructions).toBeDefined();
    });

    it('HTTP failure → unavailable with a redacted detail', async () => {
        const fetchMock = vi.fn(
            async () =>
                new Response(JSON.stringify({ error: { message: `bad key ${FAKE_KEY}` } }), {
                    status: 401,
                })
        );
        const r = await runGate({
            projectRoot: root,
            prompt: 'x',
            env: KEY_ENV,
            fetch: fetchMock as never,
        });
        expect(r).toMatchObject({ available: false, reason: 'http' });
        expect(r.stateBytes).toBeGreaterThan(0);
        expect(JSON.stringify(r)).not.toContain(FAKE_KEY);
    });

    it('writes a decision log line only when features.logging is true', async () => {
        const logFile = path.join(root, '.rulebook', 'logs', 'gate.jsonl');

        await writeConfig({ projectId: 'demo', features: { logging: false } });
        await runGate({
            projectRoot: root,
            prompt: 'secret prompt text',
            env: KEY_ENV,
            fetch: jevFetch() as never,
        });
        expect(existsSync(logFile)).toBe(false);

        await writeConfig({ projectId: 'demo', features: { logging: true } });
        await runGate({
            projectRoot: root,
            prompt: 'secret prompt text',
            env: KEY_ENV,
            fetch: jevFetch() as never,
        });
        const raw = await fs.readFile(logFile, 'utf-8');
        const lines = raw.trim().split('\n');
        expect(lines).toHaveLength(1);
        const entry = JSON.parse(lines[0]);
        expect(entry.source).toBeUndefined();
        expect(entry.promptHash).toMatch(/^[0-9a-f]{16}$/);
        expect(entry.routing).toBeDefined();
        expect(entry.usage).toEqual({ input_tokens: 2000, output_tokens: 150 });
        expect(typeof entry.elapsedMs).toBe('number');
        expect(raw).not.toContain('secret prompt text');
        expect(raw).not.toContain(FAKE_KEY);
    });

    it('records the calling entry point as `source` in the log line', async () => {
        const logFile = path.join(root, '.rulebook', 'logs', 'gate.jsonl');
        await writeConfig({ projectId: 'demo', features: { logging: true } });
        for (const source of ['mcp', 'cli', 'hook'] as const) {
            await runGate({
                projectRoot: root,
                prompt: 'x',
                env: KEY_ENV,
                fetch: jevFetch() as never,
                source,
            });
        }
        const sources = (await fs.readFile(logFile, 'utf-8'))
            .trim()
            .split('\n')
            .map((l) => JSON.parse(l).source);
        expect(sources).toEqual(['mcp', 'cli', 'hook']);
    });
});

type Handler = (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: 'text'; text: string }>;
}>;

describe('rulebook_gate MCP tool', () => {
    let root: string;
    const saved = { key: process.env.TYPESAFE_API_KEY, gate: process.env.RULEBOOK_GATE };

    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), 'rb-gate-mcp-'));
        delete process.env.RULEBOOK_GATE;
    });

    afterEach(async () => {
        vi.unstubAllGlobals();
        if (saved.key === undefined) delete process.env.TYPESAFE_API_KEY;
        else process.env.TYPESAFE_API_KEY = saved.key;
        if (saved.gate === undefined) delete process.env.RULEBOOK_GATE;
        else process.env.RULEBOOK_GATE = saved.gate;
        await fs.rm(root, { recursive: true, force: true });
    });

    function register(over: Partial<ToolContext> = {}) {
        const handlers = new Map<string, Handler>();
        const configs = new Map<string, { description: string }>();
        const server = {
            registerTool: (name: string, cfg: { description: string }, handler: Handler) => {
                handlers.set(name, handler);
                configs.set(name, cfg);
            },
        } as never;
        const ctx: ToolContext = {
            projectRoot: root,
            workspaceManager: null,
            projectIdSchema: z.string().optional(),
            getTaskMgr: async () => ({ listTasks: async () => TASKS }) as never,
            getConfigMgr: async () =>
                ({ loadConfig: async () => ({ projectId: 'demo' }) }) as never,
            getSkillsMgr: async () => {
                throw new Error('not needed');
            },
            ...over,
        };
        registerV7Tools(server, ctx);
        return { handlers, configs };
    }

    it('is registered with a terse "call first" description', () => {
        const { handlers, configs } = register();
        expect(handlers.has('rulebook_gate')).toBe(true);
        expect(configs.get('rulebook_gate')!.description).toMatch(/^Call FIRST/);
    });

    it('returns success:true with routing when Jev answers', async () => {
        process.env.TYPESAFE_API_KEY = FAKE_KEY;
        vi.stubGlobal('fetch', jevFetch({ existing_task: { choice: 'phase1_login' } }));
        await fs.mkdir(path.join(root, '.rulebook')); // a rulebook project: tasks are listed
        const { handlers } = register();
        const res = await handlers.get('rulebook_gate')!({ prompt: 'continue login' });
        const body = JSON.parse(res.content[0].text);
        expect(body.success).toBe(true);
        expect(body.available).toBe(true);
        expect(body.routing.existingTaskId).toBe('phase1_login');
        expect(typeof body.instruction).toBe('string');
        expect(typeof body.elapsedMs).toBe('number');
        expect(body.stateBytes).toBeGreaterThan(0);
        expect(res.content[0].text).not.toContain(FAKE_KEY);
    });

    it('creates nothing in a project without .rulebook/ (real managers)', async () => {
        process.env.TYPESAFE_API_KEY = FAKE_KEY;
        vi.stubGlobal('fetch', jevFetch());
        const taskMgr = await resolveTaskBackend(root, '.rulebook');
        const { handlers } = register({
            getConfigMgr: async () => new ConfigManager(root),
            getTaskMgr: async () => taskMgr,
        });
        const res = await handlers.get('rulebook_gate')!({ prompt: 'fix the typo' });
        const body = JSON.parse(res.content[0].text);
        expect(body).toMatchObject({ success: true, available: true });
        expect(existsSync(path.join(root, '.rulebook'))).toBe(false);
        expect(await fs.readdir(root)).toEqual([]);
    });

    it('still reads the config of a managed project', async () => {
        process.env.TYPESAFE_API_KEY = FAKE_KEY;
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        await fs.mkdir(path.join(root, '.rulebook'), { recursive: true });
        await fs.writeFile(
            path.join(root, '.rulebook', 'rulebook.json'),
            JSON.stringify({ integrations: { typesafe: { enabled: false } } })
        );
        const { handlers } = register({ getConfigMgr: async () => new ConfigManager(root) });
        const res = await handlers.get('rulebook_gate')!({ prompt: 'hi' });
        expect(JSON.parse(res.content[0].text)).toMatchObject({
            available: false,
            reason: 'disabled',
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns success:true, available:false without a key', async () => {
        delete process.env.TYPESAFE_API_KEY;
        const { handlers } = register();
        const res = await handlers.get('rulebook_gate')!({ prompt: 'hi' });
        const body = JSON.parse(res.content[0].text);
        expect(body).toMatchObject({ success: true, available: false, reason: 'no-key' });
        expect(body.routing.kind).toBeNull();
    });
});
