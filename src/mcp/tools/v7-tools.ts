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

/**
 * Session-boundary hygiene (docs/analysis/session-auto-cleanup/ R1): task
 * archive and session end are the natural cleanup moments — signal, in-band
 * and at zero hook cost, that rotating the session is cheapest right now.
 */
export const CONTEXT_TIP =
    'Durable state saved to .rulebook/. A fresh session boots in ~1.7k tokens — ' +
    '/clear now is the cheapest moment, or /compact <focus> to keep going.';

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
    const {
        projectRoot,
        workspaceManager,
        projectIdSchema,
        getTaskMgr,
        getSkillsMgr,
        getConfigMgr,
    } = ctx;

    /**
     * Workspace routing (#24): projectId is inferred server-side from an
     * optional path hint via longest-prefix match against project roots —
     * wrong-project calls become near-impossible instead of rule-policed.
     * An explicit projectId always wins.
     */
    function inferProjectId(pathHint?: string): string | undefined {
        if (!pathHint || !workspaceManager) return undefined;
        const norm = pathHint.replace(/\\/g, '/').toLowerCase();
        let best: { id: string; len: number } | undefined;
        for (const p of workspaceManager.getProjects()) {
            const rootNorm = p.path.replace(/\\/g, '/').toLowerCase();
            if (norm.startsWith(rootNorm) && (!best || rootNorm.length > best.len)) {
                best = { id: p.name, len: rootNorm.length };
            }
        }
        return best?.id;
    }

    function routeProjectId(args: { projectId?: string; path?: string }): string | undefined {
        return args.projectId ?? inferProjectId(args.path);
    }

    async function resolveRoot(projectId?: string, pathHint?: string): Promise<string> {
        const id = projectId ?? inferProjectId(pathHint);
        if (id && workspaceManager) {
            return (await workspaceManager.getWorker(id)).projectRoot;
        }
        return projectRoot;
    }

    // ── rulebook_task ────────────────────────────────────────────────────
    server.registerTool(
        'rulebook_task',
        {
            title: 'Rulebook Tasks',
            description:
                'Manage rulebook tasks. action: create|list|show|update|archive|validate|delete|ask|answer|questions. ' +
                'ask = a decision the spec does not settle and you cannot make: blocks the task, returns an operator form. ' +
                'blocked requires an open question or blockedBy.',
            inputSchema: {
                action: z.enum([
                    'create',
                    'list',
                    'show',
                    'update',
                    'archive',
                    'validate',
                    'delete',
                    'ask',
                    'answer',
                    'questions',
                ]),
                taskId: z.string().optional().describe('phase<N>_<kebab-name>'),
                status: z.enum(['pending', 'in-progress', 'completed', 'blocked']).optional(),
                includeArchived: z.boolean().optional(),
                skipValidation: z.boolean().optional(),
                tailWaiver: z.string().optional().describe('archive: why the tail does not apply'),
                question: z.string().optional().describe('ask: what must be decided'),
                context: z.string().optional().describe('ask: why undecidable'),
                options: z.array(z.string()).optional().describe('ask: "Label — trade-off"'),
                recommended: z.string().optional().describe('ask: your pick'),
                blocks: z.string().optional().describe('ask: checklist item'),
                questionId: z.string().optional().describe('answer: qN'),
                answer: z.string().optional().describe('answer: decision'),
                path: z.string().optional().describe('file path → routes to its project'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const tm = await getTaskMgr(routeProjectId(args));
                const needId = [
                    'create',
                    'show',
                    'update',
                    'archive',
                    'validate',
                    'delete',
                    'ask',
                    'answer',
                ];
                if (needId.includes(args.action) && !args.taskId) {
                    return fail(`action "${args.action}" requires taskId`);
                }
                const { ASK_INSTRUCTION, openQuestions, renderOperatorPrompt } =
                    await import('../../core/tasks/task-questions.js');
                switch (args.action) {
                    case 'create':
                        await tm.createTask(args.taskId!);
                        return ok({ taskId: args.taskId, message: 'created' });
                    case 'list': {
                        const tasks = await tm.listTasks(args.includeArchived || false);
                        const filtered = args.status
                            ? tasks.filter((t) => t.status === args.status)
                            : tasks;
                        const awaiting = tasks.flatMap((t) =>
                            openQuestions(t.questions).map((q) => ({
                                taskId: t.id,
                                id: q.id,
                                question: q.question,
                                recommended: q.recommended,
                            }))
                        );
                        return ok({
                            tasks: filtered.map((t) => ({
                                id: t.id,
                                title: t.title,
                                status: t.status,
                                updatedAt: t.updatedAt,
                                openQuestions: openQuestions(t.questions).length,
                            })),
                            count: filtered.length,
                            ...(awaiting.length > 0
                                ? {
                                      awaitingDecision: awaiting,
                                      hint: `${awaiting.length} decision request(s) await the operator — surface them before starting new work (action:"questions" for the full form).`,
                                  }
                                : {}),
                        });
                    }
                    case 'ask': {
                        if (!args.question) return fail('ask requires question');
                        const split = (o: string) => {
                            const [label, ...rest] = o.split(/\s+[—–-]{1,2}\s+/);
                            return {
                                label: label.trim(),
                                description: rest.join(' — ').trim() || undefined,
                            };
                        };
                        const question = await tm.askQuestion(args.taskId!, {
                            question: args.question,
                            context: args.context,
                            options: args.options?.map(split),
                            recommended: args.recommended,
                            blocks: args.blocks,
                        });
                        return ok({
                            taskId: args.taskId,
                            question,
                            taskStatus: 'blocked',
                            operatorPrompt: renderOperatorPrompt(args.taskId!, question),
                            instruction: ASK_INSTRUCTION,
                        });
                    }
                    case 'answer': {
                        if (!args.questionId || !args.answer)
                            return fail('answer requires questionId and answer');
                        const answered = await tm.answerQuestion(
                            args.taskId!,
                            args.questionId,
                            args.answer
                        );
                        const task = await tm.loadTask(args.taskId!);
                        const remaining = openQuestions(task?.questions).length;
                        return ok({
                            taskId: args.taskId,
                            question: answered,
                            taskStatus: task?.status,
                            remainingOpen: remaining,
                            message:
                                remaining === 0
                                    ? 'answered — task unblocked, resume the blocked item'
                                    : `answered — ${remaining} open question(s) still block this task`,
                        });
                    }
                    case 'questions': {
                        const all = await tm.listOpenQuestions();
                        const scoped = args.taskId
                            ? all.filter((q) => q.taskId === args.taskId)
                            : all;
                        return ok({
                            openQuestions: scoped.map((q) => ({
                                taskId: q.taskId,
                                ...q.question,
                                operatorPrompt: renderOperatorPrompt(q.taskId, q.question),
                            })),
                            count: scoped.length,
                            ...(scoped.length > 0 ? { instruction: ASK_INSTRUCTION } : {}),
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
                        await tm.archiveTask(
                            args.taskId!,
                            args.skipValidation || false,
                            args.tailWaiver
                        );
                        return ok({
                            taskId: args.taskId,
                            message: 'archived',
                            contextTip: CONTEXT_TIP,
                        });
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
                id: z.string().optional().describe('entry id'),
                title: z.string().optional(),
                content: z.string().optional().describe('body'),
                type: z.string().optional().describe('pattern|anti-pattern'),
                category: z.string().optional(),
                example: z.string().optional(),
                whenToUse: z.string().optional(),
                whenNotToUse: z.string().optional(),
                tags: z.array(z.string()).optional(),
                relatedTask: z.string().optional(),
                target: z
                    .enum(['knowledge', 'decision', 'skill'])
                    .optional()
                    .describe('promote to; skill → .claude/skills/<slug>/SKILL.md'),
                status: z.string().optional().describe('status'),
                context: z.string().optional().describe('context'),
                decision: z.string().optional().describe('text'),
                alternatives: z.array(z.string()).optional(),
                consequences: z.string().optional(),
                limit: z.number().optional(),
                path: z.string().optional().describe('file path → routes to its project'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const root = await resolveRoot(args.projectId, args.path);
                if (args.kind === 'knowledge') {
                    const { KnowledgeManager } =
                        await import('../../core/tasks/knowledge-manager.js');
                    const km = new KnowledgeManager(root);
                    switch (args.action) {
                        case 'add': {
                            if (!args.type || !args.title || !args.category || !args.content)
                                return fail(
                                    'knowledge add requires type, title, category, content'
                                );
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
                            return r
                                ? ok({ entry: r.entry, content: r.content })
                                : fail('not found');
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
                            const candidates = await lm.skillCandidates();
                            return ok({
                                learnings,
                                count: learnings.length,
                                ...(candidates.length > 0
                                    ? {
                                          skillCandidates: candidates.map((c) => ({
                                              id: c.id,
                                              title: c.title,
                                              occurrences: c.occurrences ?? 1,
                                          })),
                                          hint: 'Captured 2+ times — promote with {action:"promote", target:"skill"} so the procedure is reloaded on demand instead of re-derived.',
                                      }
                                    : {}),
                            });
                        }
                        case 'promote': {
                            if (!args.id || !args.target)
                                return fail('promote requires id and target');
                            const r = await lm.promote(args.id, args.target, {
                                title: args.title,
                                description: args.content,
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
                    // One call returns everything a session needs (F-005) —
                    // BOUNDED (#21): active context + current task + last 3
                    // history entries, never the whole file.
                    let plans: string | null = null;
                    if (existsSync(plansPath)) {
                        const full = await readFile(plansPath, 'utf-8');
                        const block = (name: string) => {
                            const m = full.match(
                                new RegExp(
                                    `<!-- PLANS:${name}:START -->([\\s\\S]*?)<!-- PLANS:${name}:END -->`
                                )
                            );
                            return m ? m[1].trim() : '';
                        };
                        const history = block('HISTORY');
                        const lastEntries = history
                            ? history.split(/^### /m).filter(Boolean).slice(0, 3)
                            : [];
                        plans =
                            [
                                block('CONTEXT') && `## Active Context\n${block('CONTEXT')}`,
                                block('TASK') && `## Current Task\n${block('TASK')}`,
                                lastEntries.length &&
                                    `## Recent Sessions\n### ${lastEntries.join('### ')}`,
                            ]
                                .filter(Boolean)
                                .join('\n\n') || null;
                        // Files without block markers (user-managed): cap at 4 KB.
                        if (!plans && full.trim()) plans = full.slice(0, 4096);
                    }
                    let tasks: unknown[] = [];
                    // Open decision requests (v7.2) ride along so a fresh
                    // session sees what the operator still owes before it
                    // picks up work — the failure mode this fixes is exactly
                    // "nobody noticed the task was waiting on a question".
                    let openQuestions: unknown[] = [];
                    try {
                        const tm = await getTaskMgr(args.projectId);
                        const { openQuestions: open, renderOperatorPrompt } =
                            await import('../../core/tasks/task-questions.js');
                        const all = await tm.listTasks(false);
                        tasks = all.map((t) => ({
                            id: t.id,
                            title: t.title,
                            status: t.status,
                            ...(open(t.questions).length > 0
                                ? { openQuestions: open(t.questions).length }
                                : {}),
                        }));
                        openQuestions = all.flatMap((t) =>
                            open(t.questions).map((q) => ({
                                taskId: t.id,
                                id: q.id,
                                question: q.question,
                                recommended: q.recommended,
                                operatorPrompt: renderOperatorPrompt(t.id, q),
                            }))
                        );
                    } catch {
                        // no tasks dir yet
                    }
                    let learnings: unknown[] = [];
                    // v7.2: learnings captured 2+ times under the same title
                    // are requests the operator keeps making — surface them so
                    // the procedure becomes a skill instead of being re-derived.
                    let skillCandidates: unknown[] = [];
                    try {
                        const { LearnManager } = await import('../../core/tasks/learn-manager.js');
                        const lm = new LearnManager(root);
                        learnings = await lm.list(5);
                        skillCandidates = (await lm.skillCandidates()).map((c) => ({
                            id: c.id,
                            title: c.title,
                            occurrences: c.occurrences ?? 1,
                        }));
                    } catch {
                        // no learnings yet
                    }
                    return ok({
                        plans,
                        tasks,
                        learnings,
                        ...(skillCandidates.length > 0
                            ? {
                                  skillCandidates,
                                  skillHint: `${skillCandidates.length} learning(s) captured 2+ times — promote with rulebook_memory {kind:"learning", action:"promote", target:"skill"} and write the SKILL.md as a procedure.`,
                              }
                            : {}),
                        ...(openQuestions.length > 0
                            ? {
                                  openQuestions,
                                  hint: `${openQuestions.length} decision request(s) await the operator. Show them (operatorPrompt) before starting new work; answer with rulebook_task {action:"answer"}.`,
                              }
                            : {}),
                    });
                }

                if (!args.summary) return fail('end requires summary');
                const date = new Date().toISOString().split('T')[0];
                const entry = `### ${date}\n${args.summary}\n`;
                const MAX_HISTORY = 20;
                if (existsSync(plansPath)) {
                    let content = await readFile(plansPath, 'utf-8');
                    content = content.includes('<!-- PLANS:HISTORY:START -->')
                        ? content.replace(
                              '<!-- PLANS:HISTORY:START -->',
                              `<!-- PLANS:HISTORY:START -->\n${entry}`
                          )
                        : content +
                          `\n## Session History\n\n<!-- PLANS:HISTORY:START -->\n${entry}<!-- PLANS:HISTORY:END -->\n`;
                    // Rotation (#21): keep the newest MAX_HISTORY entries in
                    // PLANS.md; older ones move to .rulebook/archive/plans-history.md
                    // so session-start cost stays constant forever.
                    const hm = content.match(
                        /<!-- PLANS:HISTORY:START -->([\s\S]*?)<!-- PLANS:HISTORY:END -->/
                    );
                    if (hm) {
                        const entries = hm[1].split(/^### /m).filter((e) => e.trim());
                        if (entries.length > MAX_HISTORY) {
                            const keep = entries.slice(0, MAX_HISTORY);
                            const overflow = entries.slice(MAX_HISTORY);
                            content = content.replace(
                                hm[0],
                                `<!-- PLANS:HISTORY:START -->\n### ${keep.join('### ')}<!-- PLANS:HISTORY:END -->`
                            );
                            const archDir = join(root, '.rulebook', 'archive');
                            if (!existsSync(archDir)) mkdirSync(archDir, { recursive: true });
                            const archPath = join(archDir, 'plans-history.md');
                            const prev = existsSync(archPath)
                                ? await readFile(archPath, 'utf-8')
                                : '# Rotated session history\n\n';
                            await writeFile(
                                archPath,
                                prev.trimEnd() + `\n\n### ${overflow.join('### ')}`,
                                'utf-8'
                            );
                        }
                    }
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
                return ok({ message: 'session summary saved', contextTip: CONTEXT_TIP });
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
                const { listRulesWithSource } =
                    await import('../../core/generators/rules-generator.js');
                const canonical = await listRules(root);
                const languageRules = await listRulesWithSource(root);
                return ok({ canonical, languageRules });
            } catch (error) {
                return fail(error);
            }
        }
    );

    // ── rulebook_gate (v7.4 Jev entry gate) ──────────────────────────────
    // Advisory: failure is a state (`available:false`), never an error. The
    // gate's own 8.5 s deadline finishes inside the server's 10 s guard.
    server.registerTool(
        'rulebook_gate',
        {
            title: 'Rulebook Gate',
            description:
                'Call FIRST with every operator prompt. Jev decides kind, task, model, agent, ' +
                'skill, parallelism, risk. Act on routing; unavailable/undecided → CLAUDE.md rules.',
            inputSchema: {
                prompt: z.string().describe('operator prompt verbatim'),
                notes: z.string().optional().describe('what you want decided'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const root = await resolveRoot(args.projectId);
                const { existsSync } = await import('fs');
                const { join } = await import('path');
                const { runGate } = await import('../../core/typesafe/gate.js');
                // ConfigManager.loadConfig() writes a default rulebook.json and
                // the file task backend creates tasks/ + archive/ when missing;
                // the gate must create nothing in a project without them.
                const hasConfig = existsSync(join(root, '.rulebook', 'rulebook.json'));
                const hasRulebookDir = existsSync(join(root, '.rulebook'));
                const result = await runGate({
                    projectRoot: root,
                    prompt: args.prompt,
                    notes: args.notes,
                    loadConfig: async () =>
                        hasConfig ? (await getConfigMgr(args.projectId)).loadConfig() : null,
                    listTasks: async () =>
                        hasRulebookDir ? (await getTaskMgr(args.projectId)).listTasks(false) : [],
                    source: 'mcp',
                });
                return ok({ ...result });
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
