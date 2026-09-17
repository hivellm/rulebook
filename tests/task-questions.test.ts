import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * `gh` is mocked at the child_process boundary for the GitHub backend cases,
 * exactly as in github-task-backend.test.ts. The file backend cases use a
 * throwaway directory.
 */
const execFileMock = vi.hoisted(() => vi.fn());
vi.mock('child_process', async (importOriginal) => {
    const actual = await importOriginal<typeof import('child_process')>();
    return { ...actual, execFile: execFileMock };
});

import { TaskManager } from '../src/core/tasks/task-manager.js';
import { GitHubTaskBackend } from '../src/core/tasks/github-backend.js';
import {
    applyAnswer,
    assertBlockable,
    buildQuestion,
    nextQuestionId,
    parseQuestions,
    renderOperatorPrompt,
    statusAfterAnswer,
    type TaskQuestion,
} from '../src/core/tasks/task-questions.js';
import { writeState } from '../src/core/state/state-writer.js';

const TASK = 'phase1_demo';

describe('task-questions helpers', () => {
    it('allocates sequential ids without reusing gaps', () => {
        expect(nextQuestionId([])).toBe('q1');
        const q3 = { id: 'q3', question: 'x', status: 'open', askedAt: '' } as TaskQuestion;
        expect(nextQuestionId([q3])).toBe('q4');
    });

    it('builds a question with normalized options and recommendation', () => {
        const q = buildQuestion(
            [],
            {
                question: '  Keep zod 3 or move to 4?  ',
                options: ['Keep zod 3', { label: 'Move to zod 4', description: 'breaks MCP SDK' }],
                recommended: 'Keep zod 3',
                blocks: '1.2 bump deps',
            },
            '2026-09-17T00:00:00.000Z'
        );
        expect(q).toMatchObject({
            id: 'q1',
            question: 'Keep zod 3 or move to 4?',
            status: 'open',
            recommended: 'Keep zod 3',
            blocks: '1.2 bump deps',
            askedAt: '2026-09-17T00:00:00.000Z',
        });
        expect(q.options).toEqual([
            { label: 'Keep zod 3', description: undefined },
            { label: 'Move to zod 4', description: 'breaks MCP SDK' },
        ]);
    });

    it('refuses an empty question and a recommendation outside the options', () => {
        expect(() => buildQuestion([], { question: '   ' })).toThrow(/non-empty question/);
        expect(() =>
            buildQuestion([], { question: 'A or B?', options: ['A', 'B'], recommended: 'C' })
        ).toThrow(/not one of the options/);
    });

    it('applies an answer immutably and refuses blank / duplicate / unknown answers', () => {
        const q = buildQuestion([], { question: 'A or B?' });
        const { questions, answered } = applyAnswer([q], 'q1', ' A ', '2026-09-17T01:00:00.000Z');
        expect(answered).toMatchObject({ status: 'answered', answer: 'A' });
        expect(q.status).toBe('open'); // input untouched
        expect(() => applyAnswer([q], 'q1', '  ')).toThrow(/must not be empty/);
        expect(() => applyAnswer(questions, 'q1', 'again')).toThrow(/already answered/);
        expect(() => applyAnswer([q], 'q9', 'x')).toThrow(/Question q9 not found \(open: q1\)/);
    });

    it('renders the operator prompt with options, recommendation and answer hint', () => {
        const q = buildQuestion([], {
            question: 'Which store?',
            context: 'spec silent',
            options: ['Files — simple', 'GitHub — shared'],
            recommended: 'Files — simple',
            blocks: '2.1 storage',
        });
        const text = renderOperatorPrompt(TASK, q);
        expect(text).toContain(`[${TASK} · q1] Decision needed: Which store?`);
        expect(text).toContain("Why I can't decide: spec silent");
        expect(text).toContain('Blocks: 2.1 storage');
        expect(text).toContain('1. Files — simple (recommended)');
        expect(text).toContain('2. GitHub — shared');
        expect(text).toContain(`questionId:"q1"`);
    });

    it('drops malformed metadata entries and defaults status to open', () => {
        const parsed = parseQuestions([
            { id: 'q1', question: 'ok', status: 'weird' },
            { id: 2, question: 'bad id' },
            'nope',
            null,
        ]);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].status).toBe('open');
    });

    it('decides the status after an answer from remaining questions and dependencies', () => {
        expect(statusAfterAnswer(1, {})).toBe('blocked');
        expect(statusAfterAnswer(0, { blockedBy: ['phase0_x'] })).toBe('blocked');
        expect(statusAfterAnswer(0, { blockedBy: [] })).toBe('in-progress');
    });

    it('only lets a task be blocked with an open question or a dependency', () => {
        expect(() => assertBlockable(TASK, [], {})).toThrow(/action:"ask"/);
        const open = buildQuestion([], { question: 'x' });
        expect(() => assertBlockable(TASK, [open], {})).not.toThrow();
        expect(() => assertBlockable(TASK, [], { blockedBy: ['phase0_dep'] })).not.toThrow();
    });
});

describe('TaskManager decision requests (file backend)', () => {
    let root: string;
    let tm: TaskManager;

    beforeEach(async () => {
        root = join(
            tmpdir(),
            `rulebook-questions-${Date.now()}-${Math.random().toString(36).slice(2)}`
        );
        mkdirSync(root, { recursive: true });
        tm = new TaskManager(root, '.rulebook');
        await tm.createTask(TASK);
        await tm.updateTaskStatus(TASK, 'in-progress');
    });

    afterEach(() => {
        rmSync(root, { recursive: true, force: true });
    });

    const metadata = () =>
        JSON.parse(readFileSync(join(root, '.rulebook', 'tasks', TASK, '.metadata.json'), 'utf-8'));

    it('ask stores the question and marks the task blocked', async () => {
        const q = await tm.askQuestion(TASK, {
            question: 'Which auth provider?',
            options: ['Auth0', 'Cognito'],
            recommended: 'Auth0',
        });
        expect(q.id).toBe('q1');
        expect(metadata().status).toBe('blocked');
        expect(metadata().questions).toHaveLength(1);
        const task = await tm.loadTask(TASK);
        expect(task?.status).toBe('blocked');
        expect(task?.questions?.[0].question).toBe('Which auth provider?');
    });

    it('answer records the decision and unblocks once nothing is open', async () => {
        await tm.askQuestion(TASK, { question: 'A?' });
        await tm.askQuestion(TASK, { question: 'B?' });
        await tm.answerQuestion(TASK, 'q1', 'yes');
        expect(metadata().status).toBe('blocked');
        const second = await tm.answerQuestion(TASK, 'q2', 'no');
        expect(second).toMatchObject({ id: 'q2', status: 'answered', answer: 'no' });
        expect(metadata().status).toBe('in-progress');
        expect(await tm.listOpenQuestions()).toEqual([]);
    });

    it('answer refuses an empty decision', async () => {
        await tm.askQuestion(TASK, { question: 'A?' });
        await expect(tm.answerQuestion(TASK, 'q1', '   ')).rejects.toThrow(/must not be empty/);
        expect(metadata().status).toBe('blocked');
    });

    it('answer keeps a blockedBy dependency blocking', async () => {
        const path = join(root, '.rulebook', 'tasks', TASK, '.metadata.json');
        writeFileSync(path, JSON.stringify({ ...metadata(), blockedBy: ['phase0_dep'] }));
        await tm.askQuestion(TASK, { question: 'A?' });
        await tm.answerQuestion(TASK, 'q1', 'done');
        expect(metadata().status).toBe('blocked');
        expect(metadata().blockedBy).toEqual(['phase0_dep']);
    });

    it('update status=blocked is refused without a question or dependency', async () => {
        await expect(tm.updateTaskStatus(TASK, 'blocked')).rejects.toThrow(/action:"ask"/);
        expect(metadata().status).toBe('in-progress');
        await tm.askQuestion(TASK, { question: 'A?' });
        await tm.answerQuestion(TASK, 'q1', 'x');
        await tm.updateTaskStatus(TASK, 'in-progress');
        // Answered questions do not count as a reason.
        await expect(tm.updateTaskStatus(TASK, 'blocked')).rejects.toThrow(
            /cannot be marked blocked/
        );
    });

    it('status updates preserve questions and blocker metadata', async () => {
        await tm.askQuestion(TASK, { question: 'A?' });
        await tm.answerQuestion(TASK, 'q1', 'x');
        const path = join(root, '.rulebook', 'tasks', TASK, '.metadata.json');
        writeFileSync(path, JSON.stringify({ ...metadata(), blocks: ['phase2_next'] }));
        await tm.updateTaskStatus(TASK, 'completed');
        const meta = metadata();
        expect(meta.status).toBe('completed');
        expect(meta.blocks).toEqual(['phase2_next']);
        expect(meta.questions).toHaveLength(1);
        expect(meta.questions[0].answer).toBe('x');
    });

    it('archive refuses a task with an open question even with skipValidation', async () => {
        await tm.askQuestion(TASK, { question: 'A?' });
        await expect(tm.archiveTask(TASK, true)).rejects.toThrow(/open decision request\(s\): q1/);
        expect(existsSync(join(root, '.rulebook', 'tasks', TASK))).toBe(true);
    });

    it('surfaces open questions in the README index and STATE.md', async () => {
        await tm.askQuestion(TASK, { question: 'Which DB?', recommended: 'Postgres' });
        const readme = readFileSync(join(root, '.rulebook', 'tasks', 'README.md'), 'utf-8');
        expect(readme).toContain('## ❓ Awaiting operator decision (1)');
        expect(readme).toContain(`${TASK} q1: Which DB? (recommended: Postgres)`);
        expect(readme).toContain('❓ 1 open question');
        const state = readFileSync(join(root, '.rulebook', 'STATE.md'), 'utf-8');
        expect(state).toContain('## ❓ Awaiting operator decision (1)');
        expect(state).toContain(`${TASK} q1: Which DB?`);

        await tm.answerQuestion(TASK, 'q1', 'Postgres');
        expect(readFileSync(join(root, '.rulebook', 'tasks', 'README.md'), 'utf-8')).not.toContain(
            'Awaiting operator decision'
        );
        expect(readFileSync(join(root, '.rulebook', 'STATE.md'), 'utf-8')).not.toContain(
            'Awaiting operator decision'
        );
    });

    it('listOpenQuestions spans tasks, oldest first', async () => {
        await tm.createTask('phase2_other');
        await tm.askQuestion(TASK, { question: 'first' });
        await new Promise((r) => setTimeout(r, 5));
        await tm.askQuestion('phase2_other', { question: 'second' });
        const open = await tm.listOpenQuestions();
        expect(open.map((o) => `${o.taskId}/${o.question.id}`)).toEqual([
            `${TASK}/q1`,
            'phase2_other/q1',
        ]);
    });
});

describe('writeState open questions block', () => {
    it('omits the block when there is nothing to decide', async () => {
        const root = join(tmpdir(), `rulebook-state-q-${Date.now()}`);
        mkdirSync(root, { recursive: true });
        try {
            await writeState(root, { activeTask: null, openQuestions: [], updatedAt: 'now' });
            expect(readFileSync(join(root, '.rulebook', 'STATE.md'), 'utf-8')).not.toContain('❓');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

describe('GitHubTaskBackend decision requests', () => {
    /** Calls recorded as argv arrays, without the trailing node-style callback. */
    const calls = (): string[][] => execFileMock.mock.calls.map((c) => c[1] as string[]);

    function ghReplies(...payloads: string[]) {
        let i = 0;
        execFileMock.mockImplementation(
            (_cmd: string, _args: string[], _opts: unknown, cb: unknown) => {
                const callback = (typeof _opts === 'function' ? _opts : cb) as (
                    err: Error | null,
                    out: { stdout: string; stderr: string }
                ) => void;
                const stdout = payloads[Math.min(i, payloads.length - 1)] ?? '';
                i += 1;
                callback(null, { stdout, stderr: '' });
                return {} as never;
            }
        );
    }

    const BODY = [
        '<!-- rulebook:proposal -->',
        '# Proposal: phase1_demo',
        '',
        '## Why',
        'A reason long enough to satisfy the twenty character rule.',
        '<!-- /rulebook:proposal -->',
        '',
        '<!-- rulebook:tasks -->',
        '- [x] 1.1 Done',
        '- [x] 2.1 Update or create documentation covering the implementation',
        '- [x] 2.2 Write tests covering the new behavior',
        '- [x] 2.3 Run tests and confirm they pass',
        '<!-- /rulebook:tasks -->',
    ].join('\n');

    const issue = (body: string, status = 'in-progress') =>
        JSON.stringify([
            {
                number: 7,
                title: TASK,
                body,
                state: 'OPEN',
                labels: [{ name: 'rulebook-task' }, { name: `rulebook-status:${status}` }],
            },
        ]);

    beforeEach(() => {
        // Braces matter: a hook that returns the mock would have it invoked
        // as a cleanup function by the runner.
        execFileMock.mockReset();
    });

    it('round-trips questions through the issue body', () => {
        const q = buildQuestion([], { question: 'A or B?', options: ['A', 'B'] });
        const body = GitHubTaskBackend.encodeBody({ proposal: 'p', tasks: 't', questions: [q] });
        expect(body).toContain('<!-- rulebook:questions -->');
        const decoded = GitHubTaskBackend.decodeBody(body);
        expect(decoded.questions).toEqual([q]);
        expect(
            GitHubTaskBackend.decodeBody('<!-- rulebook:tasks -->x<!-- /rulebook:tasks -->')
                .questions
        ).toBeUndefined();
    });

    it('ask appends the question and swaps the label to blocked in one gh edit', async () => {
        ghReplies(issue(BODY), '');
        const backend = new GitHubTaskBackend();
        const q = await backend.askQuestion(TASK, {
            question: 'Which DB?',
            recommended: 'Postgres',
        });
        expect(q.id).toBe('q1');
        const edit = calls()[1];
        expect(edit.slice(0, 3)).toEqual(['issue', 'edit', '7']);
        const body = edit[edit.indexOf('--body') + 1];
        expect(GitHubTaskBackend.decodeBody(body).questions?.[0]).toMatchObject({
            id: 'q1',
            question: 'Which DB?',
            status: 'open',
        });
        expect(edit).toContain('--add-label');
        expect(edit).toContain('rulebook-status:blocked');
        expect(edit).toContain('--remove-label');
        expect(edit).toContain('rulebook-status:in-progress');
    });

    it('answer records the decision and unblocks the issue', async () => {
        const open = buildQuestion([], { question: 'Which DB?' });
        const blockedBody = GitHubTaskBackend.encodeBody({
            proposal: 'p',
            tasks: 't',
            questions: [open],
        });
        ghReplies(issue(blockedBody, 'blocked'), '');
        const backend = new GitHubTaskBackend();
        const answered = await backend.answerQuestion(TASK, 'q1', 'Postgres');
        expect(answered).toMatchObject({ status: 'answered', answer: 'Postgres' });
        const edit = calls()[1];
        const body = edit[edit.indexOf('--body') + 1];
        expect(GitHubTaskBackend.decodeBody(body).questions?.[0].status).toBe('answered');
        expect(edit).toContain('rulebook-status:in-progress');
        expect(edit).toContain('--remove-label');
        expect(edit).toContain('rulebook-status:blocked');
    });

    it('refuses blocked without a question and archive with an open one', async () => {
        ghReplies(issue(BODY));
        const backend = new GitHubTaskBackend();
        await expect(backend.updateTaskStatus(TASK, 'blocked')).rejects.toThrow(/action:"ask"/);

        const open = buildQuestion([], { question: 'Which DB?' });
        const blockedBody = GitHubTaskBackend.encodeBody({
            proposal: 'p',
            tasks: 't',
            questions: [open],
        });
        ghReplies(issue(blockedBody, 'blocked'));
        await expect(backend.archiveTask(TASK, true)).rejects.toThrow(/open decision request/);
        // No close was issued.
        expect(calls().some((c) => c[1] === 'close')).toBe(false);
    });

    it('listOpenQuestions reads open questions off the issue list', async () => {
        const open = buildQuestion([], { question: 'Which DB?' });
        const { questions } = applyAnswer(
            [open, buildQuestion([open], { question: 'Second?' })],
            'q1',
            'x'
        );
        ghReplies(
            issue(GitHubTaskBackend.encodeBody({ proposal: 'p', tasks: 't', questions }), 'blocked')
        );
        const backend = new GitHubTaskBackend();
        const list = await backend.listOpenQuestions();
        expect(list).toHaveLength(1);
        expect(list[0]).toMatchObject({
            taskId: TASK,
            question: { id: 'q2', question: 'Second?' },
        });
    });
});
