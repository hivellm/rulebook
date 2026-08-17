import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/**
 * `gh` is mocked at the child_process boundary: the backend's only outside
 * dependency is the command it runs, so the tests assert on the exact argv it
 * builds and feed it canned JSON back.
 */
const execFileMock = vi.hoisted(() => vi.fn());
vi.mock('child_process', async (importOriginal) => {
    const actual = await importOriginal<typeof import('child_process')>();
    return { ...actual, execFile: execFileMock };
});

import { GitHubTaskBackend } from '../src/core/tasks/github-backend.js';
import { resolveTaskBackend, TaskManager } from '../src/core/tasks/task-manager.js';

/** Calls recorded as argv arrays, without the trailing node-style callback. */
function calls(): string[][] {
    return execFileMock.mock.calls.map((c) => c[1] as string[]);
}

/** Queue a stdout payload for the next gh invocation. */
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

const ISSUE_BODY = [
    '<!-- rulebook:proposal -->',
    '# Proposal: phase1_demo',
    '',
    '## Why',
    'A reason long enough to satisfy the twenty character rule.',
    '<!-- /rulebook:proposal -->',
    '',
    '<!-- rulebook:tasks -->',
    '## 1. Implementation',
    '- [x] 1.1 Done',
    '',
    '## 2. Tail',
    '- [x] 2.1 Update or create documentation covering the implementation',
    '- [x] 2.2 Write tests covering the new behavior',
    '- [x] 2.3 Run tests and confirm they pass',
    '<!-- /rulebook:tasks -->',
].join('\n');

const OPEN_ISSUE = {
    number: 7,
    title: 'phase1_demo',
    body: ISSUE_BODY,
    state: 'OPEN',
    labels: [{ name: 'rulebook-task' }, { name: 'rulebook-status:in-progress' }],
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-02T10:00:00Z',
};

describe('GitHubTaskBackend', () => {
    beforeEach(() => {
        execFileMock.mockReset();
    });

    describe('body encoding', () => {
        it('round-trips proposal, tasks, design and specs', () => {
            const original = {
                proposal: '# Proposal: phase1_x\n\n## Why\nBecause.',
                tasks: '## 1. Implementation\n- [ ] 1.1 Do it',
                design: '# Design\nSome shape.',
                specs: {
                    auth: '### Requirement: MUST work',
                    'api.v2': '### Requirement: SHALL work',
                },
            };

            const decoded = GitHubTaskBackend.decodeBody(GitHubTaskBackend.encodeBody(original));

            expect(decoded.proposal).toBe(original.proposal);
            expect(decoded.tasks).toBe(original.tasks);
            expect(decoded.design).toBe(original.design);
            expect(decoded.specs).toEqual(original.specs);
        });

        it('tolerates a body with no rulebook sections', () => {
            const decoded = GitHubTaskBackend.decodeBody('Someone wrote a plain issue.');
            expect(decoded.proposal).toBeUndefined();
            expect(decoded.tasks).toBeUndefined();
            expect(decoded.specs).toEqual({});
        });
    });

    describe('createTask', () => {
        it('rejects a task id without a phase prefix before touching gh', async () => {
            const backend = new GitHubTaskBackend();
            await expect(backend.createTask('no-phase-prefix')).rejects.toThrow(/phase prefix/);
            expect(execFileMock).not.toHaveBeenCalled();
        });

        it('creates a labelled issue carrying the scaffold', async () => {
            ghReplies('[]', '');
            const backend = new GitHubTaskBackend({ repo: 'acme/widgets' });

            await backend.createTask('phase2_new-thing');

            const create = calls().find((c) => c[1] === 'create')!;
            expect(create).toContain('--title');
            expect(create[create.indexOf('--title') + 1]).toBe('phase2_new-thing');
            expect(create).toContain('rulebook-task');
            expect(create).toContain('rulebook-status:pending');
            // --repo is threaded through to every call.
            expect(create[create.indexOf('--repo') + 1]).toBe('acme/widgets');

            const body = create[create.indexOf('--body') + 1];
            expect(body).toContain('<!-- rulebook:proposal -->');
            expect(body).toContain('# Proposal: phase2_new-thing');
            // The mandatory tail must be scaffolded exactly as on the file side.
            expect(body).toContain('Run tests and confirm they pass');
        });

        it('refuses to create a task whose issue already exists', async () => {
            ghReplies(JSON.stringify([OPEN_ISSUE]));
            const backend = new GitHubTaskBackend();

            await expect(backend.createTask('phase1_demo')).rejects.toThrow(/already exists/);
        });
    });

    describe('reading tasks', () => {
        it('maps an issue to a task, status coming from the label', async () => {
            ghReplies(JSON.stringify([OPEN_ISSUE]));
            const backend = new GitHubTaskBackend();

            const task = await backend.loadTask('phase1_demo');

            expect(task).not.toBeNull();
            expect(task!.id).toBe('phase1_demo');
            expect(task!.status).toBe('in-progress');
            expect(task!.proposal).toContain('## Why');
            expect(task!.tasks).toContain('- [x] 1.1 Done');
        });

        it('treats a closed issue with no status label as completed and archived', async () => {
            ghReplies(
                JSON.stringify([
                    {
                        ...OPEN_ISSUE,
                        state: 'CLOSED',
                        labels: [{ name: 'rulebook-task' }],
                        closedAt: '2026-08-05T09:00:00Z',
                    },
                ])
            );
            const backend = new GitHubTaskBackend();

            const task = await backend.loadTask('phase1_demo');

            expect(task!.status).toBe('completed');
            expect(task!.archivedAt).toBe('2026-08-05');
        });

        it('returns null for an unknown task', async () => {
            ghReplies('[]');
            expect(await new GitHubTaskBackend().loadTask('phase9_missing')).toBeNull();
        });

        it('lists only open issues unless archived are requested', async () => {
            ghReplies(JSON.stringify([OPEN_ISSUE]));
            await new GitHubTaskBackend().listTasks(false);
            expect(calls()[0][calls()[0].indexOf('--state') + 1]).toBe('open');

            execFileMock.mockReset();
            ghReplies(JSON.stringify([OPEN_ISSUE]));
            await new GitHubTaskBackend().listTasks(true);
            expect(calls()[0][calls()[0].indexOf('--state') + 1]).toBe('all');
        });
    });

    describe('status and archive', () => {
        it('swaps the status label instead of accumulating them', async () => {
            ghReplies(JSON.stringify([OPEN_ISSUE]), '');
            const backend = new GitHubTaskBackend();

            await backend.updateTaskStatus('phase1_demo', 'blocked');

            const edit = calls().find((c) => c[1] === 'edit')!;
            expect(edit[edit.indexOf('--add-label') + 1]).toBe('rulebook-status:blocked');
            expect(edit[edit.indexOf('--remove-label') + 1]).toBe('rulebook-status:in-progress');
        });

        it('closes the issue when the task validates', async () => {
            ghReplies(JSON.stringify([OPEN_ISSUE]), '');
            const backend = new GitHubTaskBackend();

            await backend.archiveTask('phase1_demo');

            const close = calls().find((c) => c[1] === 'close');
            expect(close).toBeDefined();
            expect(close![2]).toBe('7');
        });

        it('refuses to archive over an unchecked tail without a waiver', async () => {
            const unchecked = OPEN_ISSUE.body.replace(
                '- [x] 2.3 Run tests and confirm they pass',
                '- [ ] 2.3 Run tests and confirm they pass'
            );
            ghReplies(JSON.stringify([{ ...OPEN_ISSUE, body: unchecked }]));

            await expect(new GitHubTaskBackend().archiveTask('phase1_demo')).rejects.toThrow(
                /tailWaiver/
            );
            expect(calls().some((c) => c[1] === 'close')).toBe(false);
        });

        it('records the waiver in the issue body, then closes', async () => {
            const unchecked = OPEN_ISSUE.body.replace(
                '- [x] 2.3 Run tests and confirm they pass',
                '- [ ] 2.3 Run tests and confirm they pass'
            );
            ghReplies(JSON.stringify([{ ...OPEN_ISSUE, body: unchecked }]), '', '');

            await new GitHubTaskBackend().archiveTask('phase1_demo', false, 'docs-only change');

            const edit = calls().find((c) => c[1] === 'edit')!;
            expect(edit[edit.indexOf('--body') + 1]).toContain('tail-waiver: docs-only change');
            expect(calls().some((c) => c[1] === 'close')).toBe(true);
        });

        it('fails archive when the proposal is too thin', async () => {
            const thin = ISSUE_BODY.replace(
                'A reason long enough to satisfy the twenty character rule.',
                'short'
            );
            ghReplies(JSON.stringify([{ ...OPEN_ISSUE, body: thin }]));

            await expect(new GitHubTaskBackend().archiveTask('phase1_demo')).rejects.toThrow(
                /at least 20 characters/
            );
        });
    });

    describe('failure reporting', () => {
        it('explains how to recover when gh is not installed', async () => {
            execFileMock.mockImplementation(
                (_cmd: string, _args: string[], _opts: unknown, cb: unknown) => {
                    const callback = (typeof _opts === 'function' ? _opts : cb) as (
                        err: NodeJS.ErrnoException
                    ) => void;
                    const err: NodeJS.ErrnoException = new Error('spawn gh ENOENT');
                    err.code = 'ENOENT';
                    callback(err);
                    return {} as never;
                }
            );

            await expect(new GitHubTaskBackend().listTasks()).rejects.toThrow(
                /requires the `gh` CLI/
            );
        });
    });
});

describe('resolveTaskBackend', () => {
    let projectRoot: string;

    beforeEach(async () => {
        execFileMock.mockReset();
        projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-backend-'));
    });

    afterEach(async () => {
        await fs.rm(projectRoot, { recursive: true, force: true });
    });

    async function writeConfig(config: unknown) {
        await fs.mkdir(path.join(projectRoot, '.rulebook'), { recursive: true });
        await fs.writeFile(
            path.join(projectRoot, '.rulebook', 'rulebook.json'),
            JSON.stringify(config)
        );
    }

    it('defaults to the file backend when there is no config', async () => {
        expect(await resolveTaskBackend(projectRoot)).toBeInstanceOf(TaskManager);
    });

    it('defaults to the file backend when tasks.backend is absent or "files"', async () => {
        await writeConfig({ version: '7.0.0' });
        expect(await resolveTaskBackend(projectRoot)).toBeInstanceOf(TaskManager);

        await writeConfig({ tasks: { backend: 'files' } });
        expect(await resolveTaskBackend(projectRoot)).toBeInstanceOf(TaskManager);
    });

    it('returns the GitHub backend when configured for it', async () => {
        await writeConfig({ tasks: { backend: 'github', repo: 'acme/widgets' } });
        expect(await resolveTaskBackend(projectRoot)).toBeInstanceOf(GitHubTaskBackend);
    });

    it('falls back to files rather than throwing on a corrupt config', async () => {
        await fs.mkdir(path.join(projectRoot, '.rulebook'), { recursive: true });
        await fs.writeFile(path.join(projectRoot, '.rulebook', 'rulebook.json'), '{ not json');

        expect(await resolveTaskBackend(projectRoot)).toBeInstanceOf(TaskManager);
    });
});
