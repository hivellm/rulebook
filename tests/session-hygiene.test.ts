import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import os from 'os';
import { z } from 'zod';
import { registerV7Tools, CONTEXT_TIP } from '../src/mcp/tools/v7-tools';
import { STATUS_LINE_COMMAND } from '../src/core/claude/claude-settings-manager';
import { TaskManager } from '../src/core/tasks/task-manager';
import type { ToolContext } from '../src/mcp/tools/context';

/**
 * Session-boundary hygiene (docs/analysis/session-auto-cleanup/):
 * R1 — contextTip on task archive + session end responses;
 * R2 — statusline context meter;
 * R4 — session start returns everything a cold session needs in one call.
 */

type Handler = (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: 'text'; text: string }>;
}>;

function fakeServer(handlers: Map<string, Handler>) {
    return {
        registerTool: (name: string, _cfg: unknown, handler: Handler) => {
            handlers.set(name, handler);
        },
    } as never;
}

function makeCtx(projectRoot: string, taskMgr?: Partial<TaskManager>): ToolContext {
    const tm = (taskMgr ?? new TaskManager(projectRoot, '.rulebook')) as TaskManager;
    return {
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
}

async function call(handlers: Map<string, Handler>, tool: string, args: Record<string, unknown>) {
    const handler = handlers.get(tool);
    expect(handler, `tool ${tool} registered`).toBeDefined();
    const res = await handler!(args);
    return JSON.parse(res.content[0].text);
}

describe('session hygiene (R1/R2/R4)', () => {
    let projectRoot: string;
    let handlers: Map<string, Handler>;

    beforeEach(async () => {
        projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rb-hygiene-'));
        await fs.mkdir(path.join(projectRoot, '.rulebook'), { recursive: true });
        handlers = new Map();
    });

    afterEach(async () => {
        await fs.rm(projectRoot, { recursive: true, force: true });
    });

    it('session start returns plans + tasks + learnings in one call (R4)', async () => {
        await fs.writeFile(
            path.join(projectRoot, '.rulebook', 'PLANS.md'),
            '# Plans\ncurrent focus'
        );
        registerV7Tools(fakeServer(handlers), makeCtx(projectRoot));

        const out = await call(handlers, 'rulebook_session', { action: 'start' });

        expect(out.success).toBe(true);
        expect(out.plans).toContain('current focus');
        expect(Array.isArray(out.tasks)).toBe(true);
        expect(Array.isArray(out.learnings)).toBe(true);
    });

    it('session end response carries the contextTip (R1)', async () => {
        registerV7Tools(fakeServer(handlers), makeCtx(projectRoot));

        const out = await call(handlers, 'rulebook_session', {
            action: 'end',
            summary: 'wrapped up the feature',
        });

        expect(out.success).toBe(true);
        expect(out.contextTip).toBe(CONTEXT_TIP);
        expect(out.contextTip).toContain('/clear');
    });

    it('task archive response carries the contextTip (R1)', async () => {
        const stub = { archiveTask: async () => undefined } as unknown as TaskManager;
        registerV7Tools(fakeServer(handlers), makeCtx(projectRoot, stub));

        const out = await call(handlers, 'rulebook_task', {
            action: 'archive',
            taskId: 'phase1_done',
        });

        expect(out.success).toBe(true);
        expect(out.contextTip).toBe(CONTEXT_TIP);
    });

    describe('statusline context meter (R2)', () => {
        function renderStatusline(stdinJson: string): string {
            return execFileSync('bash', ['-c', STATUS_LINE_COMMAND], {
                input: stdinJson,
                encoding: 'utf-8',
                cwd: projectRoot,
            }).trim();
        }

        it('appends ctx NN% when used_percentage is present', () => {
            const out = renderStatusline(
                JSON.stringify({ context_window: { used_percentage: 62.4 } })
            );
            expect(out).toContain('ctx 62%');
        });

        it('degrades gracefully when the field is absent', () => {
            const out = renderStatusline(JSON.stringify({ model: { id: 'x' } }));
            expect(out).not.toContain('ctx');
            expect(out.length).toBeGreaterThan(0); // still renders dir segment
        });
    });
});
