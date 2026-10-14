import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs, existsSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';
import { z } from 'zod';
import { registerV7Tools } from '../src/mcp/tools/v7-tools';
import { TaskManager } from '../src/core/tasks/task-manager';
import { taskCreateCommand, TASK_CREATE_USAGE } from '../src/cli/commands/task';
import type { ToolContext } from '../src/mcp/tools/context';

/**
 * v7.5: a task is created with its content (why, what, items, impact) in one
 * call — through the MCP tool and through the CLI. There is no empty scaffold.
 */

type Handler = (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: 'text'; text: string }>;
}>;

function registerTools(projectRoot: string): Map<string, Handler> {
    const handlers = new Map<string, Handler>();
    const tm = new TaskManager(projectRoot, '.rulebook');
    const ctx: ToolContext = {
        projectRoot,
        workspaceManager: null,
        projectIdSchema: z.string().optional(),
        getTaskMgr: async () => tm,
        getConfigMgr: async () => {
            throw new Error('not needed');
        },
        getSkillsMgr: async () => {
            throw new Error('not needed');
        },
    };
    const server = {
        registerTool: (name: string, _cfg: unknown, handler: Handler) => {
            handlers.set(name, handler);
        },
    } as never;
    registerV7Tools(server, ctx);
    return handlers;
}

async function callTask(handlers: Map<string, Handler>, args: Record<string, unknown>) {
    const res = await handlers.get('rulebook_task')!(args);
    return JSON.parse(res.content[0].text);
}

describe('task create with content (v7.5)', () => {
    let projectRoot: string;
    const taskDir = (id: string) => path.join(projectRoot, '.rulebook', 'tasks', id);

    beforeEach(async () => {
        projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rb-create-'));
        await fs.mkdir(path.join(projectRoot, '.rulebook'), { recursive: true });
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await fs.rm(projectRoot, { recursive: true, force: true });
    });

    describe('MCP rulebook_task create', () => {
        it('fails naming every missing field and creates nothing', async () => {
            const handlers = registerTools(projectRoot);
            const out = await callTask(handlers, { action: 'create', taskId: 'phase1_bare' });

            expect(out.success).toBe(false);
            expect(JSON.stringify(out)).toContain('create requires why, what, items');
            expect(existsSync(taskDir('phase1_bare'))).toBe(false);
        });

        it('creates a complete task and reports the item count', async () => {
            const handlers = registerTools(projectRoot);
            const out = await callTask(handlers, {
                action: 'create',
                taskId: 'phase1_full',
                why: 'Tasks must be born complete in one call',
                what: 'Create takes the content',
                items: ['First step', 'Second step'],
                impact: { breaking: true },
            });

            expect(out).toMatchObject({ taskId: 'phase1_full', message: 'created', items: 2 });
            const tasks = readFileSync(path.join(taskDir('phase1_full'), 'tasks.md'), 'utf-8');
            expect(tasks).toContain('- [ ] 1.1 First step\n- [ ] 1.2 Second step');
            const proposal = readFileSync(
                path.join(taskDir('phase1_full'), 'proposal.md'),
                'utf-8'
            );
            expect(proposal).toContain('- Breaking change: YES');
        });

        it('surfaces a too-short why from the task store', async () => {
            const handlers = registerTools(projectRoot);
            const out = await callTask(handlers, {
                action: 'create',
                taskId: 'phase1_short',
                why: 'too short',
                what: 'x',
                items: ['a'],
            });

            expect(out.success).toBe(false);
            expect(JSON.stringify(out)).toContain('why must have at least 20 characters');
            expect(existsSync(taskDir('phase1_short'))).toBe(false);
        });
    });

    describe('CLI rulebook task create', () => {
        beforeEach(() => {
            vi.spyOn(process, 'cwd').mockReturnValue(projectRoot);
            vi.spyOn(console, 'log').mockImplementation(() => undefined);
        });

        it('creates a task from flags', async () => {
            await taskCreateCommand('phase1_from-flags', {
                why: 'Flags carry the whole task content',
                what: 'Create from the command line',
                item: ['Step one', 'Step two'],
                impactCode: 'src/cli',
                impactBreaking: 'no',
            });

            const proposal = readFileSync(
                path.join(taskDir('phase1_from-flags'), 'proposal.md'),
                'utf-8'
            );
            expect(proposal).toContain('## Why\nFlags carry the whole task content');
            expect(proposal).toContain('- Affected code: src/cli');
            expect(proposal).toContain('- Breaking change: NO');
            const tasks = readFileSync(
                path.join(taskDir('phase1_from-flags'), 'tasks.md'),
                'utf-8'
            );
            expect(tasks).toContain('- [ ] 1.2 Step two');
        });

        it('creates a task from --from <file.json>, with flags overriding the file', async () => {
            const file = path.join(projectRoot, 'task.json');
            await fs.writeFile(
                file,
                JSON.stringify({
                    why: 'The JSON file carries the task content',
                    what: 'From the file',
                    items: ['File item'],
                    impact: { specs: 'from-file.md', benefit: 'Less typing' },
                })
            );

            await taskCreateCommand('phase1_from-file', { from: file, what: 'Overridden by flag' });

            const proposal = readFileSync(
                path.join(taskDir('phase1_from-file'), 'proposal.md'),
                'utf-8'
            );
            expect(proposal).toContain('## Why\nThe JSON file carries the task content');
            expect(proposal).toContain('## What Changes\nOverridden by flag');
            expect(proposal).toContain('- Affected specs: from-file.md');
            expect(proposal).toContain('- User benefit: Less typing');
            const tasks = readFileSync(path.join(taskDir('phase1_from-file'), 'tasks.md'), 'utf-8');
            expect(tasks).toContain('- [ ] 1.1 File item');
        });

        it('exits non-zero with usage when content is missing', async () => {
            const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
                throw new Error('process.exit');
            }) as never);
            const errors: string[] = [];
            vi.spyOn(console, 'error').mockImplementation((msg: string) => {
                errors.push(String(msg));
            });

            await expect(taskCreateCommand('phase1_missing', { why: 'x' })).rejects.toThrow(
                'process.exit'
            );

            expect(exit).toHaveBeenCalledWith(1);
            const output = errors.join('\n');
            expect(output).toContain('why must have at least 20 characters');
            expect(output).toContain('what is required');
            expect(output).toContain('items needs at least one checklist item');
            expect(output).toContain(TASK_CREATE_USAGE);
            expect(existsSync(taskDir('phase1_missing'))).toBe(false);
        });
    });
});
