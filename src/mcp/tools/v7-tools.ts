import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './context.js';

/**
 * v7 consolidated MCP surface (F-003/F-005): 26 per-verb tools collapsed into
 * 6 action-parameterized tools with terse schemas. Session-start returns
 * everything in one call. Enforcement (task-id format, mandatory tail) lives
 * in the managers, so a malformed request fails at the tool boundary instead
 * of via editor hooks.
 */

type ToolResult = { content: Array<{ type: 'text'; text: string }> };

function ok(payload: Record<string, unknown>): ToolResult {
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, ...payload }) }] };
}

function fail(error: unknown): ToolResult {
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                }),
            },
        ],
    };
}

export function registerV7Tools(server: McpServer, ctx: ToolContext): void {
    const { projectRoot, workspaceManager, projectIdSchema, getTaskMgr, getSkillsMgr, getConfigMgr } =
        ctx;

    async function resolveRoot(projectId?: string): Promise<string> {
        if (projectId && workspaceManager) {
            return (await workspaceManager.getWorker(projectId)).projectRoot;
        }
        return projectRoot;
    }

    // ── rulebook_task ────────────────────────────────────────────────────
    server.registerTool(
        'rulebook_task',
        {
            title: 'Rulebook Tasks',
            description:
                'Manage rulebook tasks. action: create|list|show|update|archive|validate|delete',
            inputSchema: {
                action: z.enum([
                    'create',
                    'list',
                    'show',
                    'update',
                    'archive',
                    'validate',
                    'delete',
                ]),
                taskId: z.string().optional().describe('phase<N>_<kebab-name>'),
                status: z.enum(['pending', 'in-progress', 'completed', 'blocked']).optional(),
                includeArchived: z.boolean().optional(),
                skipValidation: z.boolean().optional(),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const tm = await getTaskMgr(args.projectId);
                const needId = ['create', 'show', 'update', 'archive', 'validate', 'delete'];
                if (needId.includes(args.action) && !args.taskId) {
                    return fail(`action "${args.action}" requires taskId`);
                }
                switch (args.action) {
                    case 'create':
                        await tm.createTask(args.taskId!);
                        return ok({ taskId: args.taskId, message: 'created' });
                    case 'list': {
                        const tasks = await tm.listTasks(args.includeArchived || false);
                        const filtered = args.status
                            ? tasks.filter((t) => t.status === args.status)
                            : tasks;
                        return ok({
                            tasks: filtered.map((t) => ({
                                id: t.id,
                                title: t.title,
                                status: t.status,
                                updatedAt: t.updatedAt,
                            })),
                            count: filtered.length,
                        });
                    }
                    case 'show': {
                        const task = await tm.showTask(args.taskId!);
                        return ok({ task, found: task !== null });
                    }
                    case 'update':
                        if (args.status) await tm.updateTaskStatus(args.taskId!, args.status);
                        return ok({ taskId: args.taskId, message: 'updated' });
                    case 'archive':
                        await tm.archiveTask(args.taskId!, args.skipValidation || false);
                        return ok({ taskId: args.taskId, message: 'archived' });
                    case 'validate': {
                        const v = await tm.validateTask(args.taskId!);
                        return ok({ valid: v.valid, errors: v.errors, warnings: v.warnings });
                    }
                    case 'delete':
                        await tm.deleteTask(args.taskId!);
                        return ok({ taskId: args.taskId, message: 'deleted' });
                }
            } catch (error) {
                return fail(error);
            }
        }
    );

    // ── rulebook_memory ──────────────────────────────────────────────────
    server.registerTool(
        'rulebook_memory',
        {
            title: 'Rulebook Memory',
            description: 'Project memory (knowledge/learnings/decisions) by kind + action',
            inputSchema: {
                kind: z.enum(['knowledge', 'learning', 'decision']),
                action: z.enum(['add', 'list', 'show', 'update', 'promote']),
                id: z.string().optional().describe('Entry id (decision: numeric id as string)'),
                title: z.string().optional(),
                content: z.string().optional().describe('Body / description'),
                type: z.string().optional().describe('knowledge: pattern|anti-pattern'),
                category: z.string().optional(),
                example: z.string().optional(),
                whenToUse: z.string().optional(),
                whenNotToUse: z.string().optional(),
                tags: z.array(z.string()).optional(),
                relatedTask: z.string().optional(),
                target: z.enum(['knowledge', 'decision']).optional().describe('promote target'),
                status: z.string().optional().describe('decision status'),
                context: z.string().optional().describe('decision context'),
                decision: z.string().optional().describe('decision text'),
                alternatives: z.array(z.string()).optional(),
                consequences: z.string().optional(),
                limit: z.number().optional(),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const root = await resolveRoot(args.projectId);
                if (args.kind === 'knowledge') {
                    const { KnowledgeManager } = await import(
                        '../../core/tasks/knowledge-manager.js'
                    );
                    const km = new KnowledgeManager(root);
                    switch (args.action) {
                        case 'add': {
                            if (!args.type || !args.title || !args.category || !args.content)
                                return fail('knowledge add requires type, title, category, content');
                            const entry = await km.add(args.type as any, args.title, {
                                category: args.category as any,
                                description: args.content,
                                example: args.example,
                                whenToUse: args.whenToUse,
                                whenNotToUse: args.whenNotToUse,
                                tags: args.tags,
                            });
                            return ok({ entry });
                        }
                        case 'list': {
                            const entries = await km.list(args.type as any, args.category as any);
                            return ok({ entries, count: entries.length });
                        }
                        case 'show': {
                            if (!args.id) return fail('show requires id');
                            const r = await km.show(args.id);
                            return r ? ok({ entry: r.entry, content: r.content }) : fail('not found');
                        }
                        default:
                            return fail(`knowledge does not support action "${args.action}"`);
                    }
                }
                if (args.kind === 'learning') {
                    const { LearnManager } = await import('../../core/tasks/learn-manager.js');
                    const lm = new LearnManager(root);
                    switch (args.action) {
                        case 'add': {
                            if (!args.title || !args.content)
                                return fail('learning add requires title, content');
                            const learning = await lm.capture(args.title, args.content, {
                                tags: args.tags,
                                relatedTask: args.relatedTask,
                            });
                            return ok({ learning });
                        }
                        case 'list': {
                            const learnings = await lm.list(args.limit);
                            return ok({ learnings, count: learnings.length });
                        }
                        case 'promote': {
                            if (!args.id || !args.target)
                                return fail('promote requires id and target');
                            const r = await lm.promote(args.id, args.target, {
                                title: args.title,
                            });
                            return r ? ok({ promoted: r }) : fail('not found');
                        }
                        default:
                            return fail(`learning does not support action "${args.action}"`);
                    }
                }
                // decision
                const { DecisionManager } = await import('../../core/tasks/decision-manager.js');
                const dm = new DecisionManager(root);
                switch (args.action) {
                    case 'add': {
                        if (!args.title) return fail('decision add requires title');
                        const d = await dm.create(args.title, {
                            context: args.context,
                            decision: args.decision,
                            alternatives: args.alternatives,
                            consequences: args.consequences,
                            relatedTasks: args.relatedTask ? [args.relatedTask] : undefined,
                        });
                        return ok({ decision: d });
                    }
                    case 'list': {
                        const decisions = await dm.list(args.status as any);
                        return ok({ decisions, count: decisions.length });
                    }
                    case 'show': {
                        if (!args.id) return fail('show requires id');
                        const r = await dm.show(Number(args.id));
                        return r
                            ? ok({ decision: r.decision, content: r.content })
                            : fail('not found');
                    }
                    case 'update': {
                        if (!args.id) return fail('update requires id');
                        const u = await dm.update(Number(args.id), {
                            status: args.status as any,
                            context: args.context,
                            decision: args.decision,
                        });
                        return u ? ok({ decision: u }) : fail('not found');
                    }
                    default:
                        return fail(`decision does not support action "${args.action}"`);
                }
            } catch (error) {
                return fail(error);
            }
        }
    );

    // ── rulebook_session ─────────────────────────────────────────────────
    server.registerTool(
        'rulebook_session',
        {
            title: 'Rulebook Session',
            description: 'start: plans+tasks+learnings in one call | end: save summary',
            inputSchema: {
                action: z.enum(['start', 'end']),
                summary: z.string().optional().describe('end: session summary'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const root = await resolveRoot(args.projectId);
                const { join } = await import('path');
                const { existsSync, mkdirSync } = await import('fs');
                const { readFile, writeFile } = await import('fs/promises');
                const plansPath = join(root, '.rulebook', 'PLANS.md');

                if (args.action === 'start') {
                    // One call returns everything a session needs (F-005).
                    const plans = existsSync(plansPath)
                        ? await readFile(plansPath, 'utf-8')
                        : null;
                    let tasks: unknown[] = [];
                    try {
                        const tm = await getTaskMgr(args.projectId);
                        tasks = (await tm.listTasks(false)).map((t) => ({
                            id: t.id,
                            title: t.title,
                            status: t.status,
                        }));
                    } catch {
                        // no tasks dir yet
                    }
                    let learnings: unknown[] = [];
                    try {
                        const { LearnManager } = await import('../../core/tasks/learn-manager.js');
                        learnings = await new LearnManager(root).list(5);
                    } catch {
                        // no learnings yet
                    }
                    return ok({ plans, tasks, learnings });
                }

                if (!args.summary) return fail('end requires summary');
                const date = new Date().toISOString().split('T')[0];
                const entry = `### ${date}\n${args.summary}\n`;
                if (existsSync(plansPath)) {
                    let content = await readFile(plansPath, 'utf-8');
                    content = content.includes('<!-- PLANS:HISTORY:START -->')
                        ? content.replace(
                              '<!-- PLANS:HISTORY:START -->',
                              `<!-- PLANS:HISTORY:START -->\n${entry}`
                          )
                        : content +
                          `\n## Session History\n\n<!-- PLANS:HISTORY:START -->\n${entry}<!-- PLANS:HISTORY:END -->\n`;
                    await writeFile(plansPath, content, 'utf-8');
                } else {
                    const dir = join(root, '.rulebook');
                    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
                    await writeFile(
                        plansPath,
                        `# Project Plans & Session Context\n\n## Session History\n\n<!-- PLANS:HISTORY:START -->\n${entry}<!-- PLANS:HISTORY:END -->\n`,
                        'utf-8'
                    );
                }
                return ok({ message: 'session summary saved' });
            } catch (error) {
                return fail(error);
            }
        }
    );

    // ── rulebook_skill ───────────────────────────────────────────────────
    server.registerTool(
        'rulebook_skill',
        {
            title: 'Rulebook Skills',
            description: 'action: list|show|search|enable|disable|validate',
            inputSchema: {
                action: z.enum(['list', 'show', 'search', 'enable', 'disable', 'validate']),
                skillId: z.string().optional().describe('e.g. languages/typescript'),
                query: z.string().optional(),
                category: z.string().optional(),
                enabledOnly: z.boolean().optional(),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const sm = await getSkillsMgr(args.projectId);
                const cm = await getConfigMgr(args.projectId);
                const rbConfig = await cm.loadConfig();
                const enabledIds = new Set(rbConfig.skills?.enabled || []);
                const brief = (s: any) => ({
                    id: s.id,
                    name: s.metadata.name,
                    description: s.metadata.description,
                    category: s.category,
                    enabled: enabledIds.has(s.id),
                });

                switch (args.action) {
                    case 'list': {
                        const skills = args.category
                            ? await sm.getSkillsByCategory(args.category as any)
                            : await sm.getSkills();
                        let mapped = skills.map(brief);
                        if (args.enabledOnly) mapped = mapped.filter((s) => s.enabled);
                        return ok({ skills: mapped, count: mapped.length });
                    }
                    case 'show': {
                        if (!args.skillId) return fail('show requires skillId');
                        const skill = await sm.getSkillById(args.skillId);
                        if (!skill) return fail(`skill not found: ${args.skillId}`);
                        return ok({
                            skill: {
                                ...brief(skill),
                                version: skill.metadata.version,
                                tags: skill.metadata.tags,
                                content:
                                    skill.content.slice(0, 2000) +
                                    (skill.content.length > 2000 ? '...' : ''),
                            },
                        });
                    }
                    case 'search': {
                        if (!args.query) return fail('search requires query');
                        const skills = await sm.searchSkills(args.query);
                        return ok({ skills: skills.map(brief), count: skills.length });
                    }
                    case 'enable': {
                        if (!args.skillId) return fail('enable requires skillId');
                        const next = await sm.enableSkill(args.skillId, rbConfig);
                        await cm.saveConfig(next);
                        const v = await sm.validateSkills(next);
                        return ok({ skillId: args.skillId, warnings: v.warnings });
                    }
                    case 'disable': {
                        if (!args.skillId) return fail('disable requires skillId');
                        if (!rbConfig.skills?.enabled?.includes(args.skillId))
                            return fail(`skill ${args.skillId} is not enabled`);
                        const next = await sm.disableSkill(args.skillId, rbConfig);
                        await cm.saveConfig(next);
                        return ok({ skillId: args.skillId });
                    }
                    case 'validate': {
                        const v = await sm.validateSkills(rbConfig);
                        return ok({
                            valid: v.valid,
                            errors: v.errors,
                            warnings: v.warnings,
                            conflicts: v.conflicts,
                        });
                    }
                }
            } catch (error) {
                return fail(error);
            }
        }
    );

    // ── rulebook_rules ───────────────────────────────────────────────────
    server.registerTool(
        'rulebook_rules',
        {
            title: 'Rulebook Rules',
            description: 'List project rules (user-authored canonical + path-scoped language)',
            inputSchema: { projectId: projectIdSchema },
        },
        async (args) => {
            try {
                const root = await resolveRoot(args.projectId);
                const { listRules } = await import('../../core/rule-engine.js');
                const { listRulesWithSource } = await import(
                    '../../core/generators/rules-generator.js'
                );
                const canonical = await listRules(root);
                const languageRules = await listRulesWithSource(root);
                return ok({ canonical, languageRules });
            } catch (error) {
                return fail(error);
            }
        }
    );

    // ── rulebook_workspace (workspace mode only) ─────────────────────────
    if (!workspaceManager) return;
    server.registerTool(
        'rulebook_workspace',
        {
            title: 'Rulebook Workspace',
            description: 'action: list|status|tasks (cross-project)',
            inputSchema: {
                action: z.enum(['list', 'status', 'tasks']),
                status: z.enum(['pending', 'in-progress', 'completed', 'blocked']).optional(),
            },
        },
        async (args) => {
            try {
                switch (args.action) {
                    case 'list': {
                        const projects = workspaceManager.getProjects();
                        const activeIds = workspaceManager.getActiveWorkerIds();
                        return ok({
                            workspace: workspaceManager.getConfig().name,
                            defaultProject: workspaceManager.getDefaultProjectId(),
                            projects: projects.map((p) => ({
                                name: p.name,
                                path: p.path,
                                workerActive: activeIds.includes(p.name),
                            })),
                        });
                    }
                    case 'status':
                        return ok({ ...(await workspaceManager.getStatus()) });
                    case 'tasks': {
                        const all: Array<{ project: string; tasks: unknown[] }> = [];
                        for (const project of workspaceManager.getProjects()) {
                            try {
                                const tm = await getTaskMgr(project.name);
                                const tasks = await tm.listTasks(false);
                                const filtered = args.status
                                    ? tasks.filter((t) => t.status === args.status)
                                    : tasks;
                                if (filtered.length > 0) {
                                    all.push({
                                        project: project.name,
                                        tasks: filtered.map((t) => ({
                                            id: t.id,
                                            title: t.title,
                                            status: t.status,
                                        })),
                                    });
                                }
                            } catch {
                                // skip failing projects
                            }
                        }
                        return ok({ projects: all });
                    }
                }
            } catch (error) {
                return fail(error);
            }
        }
    );
}
