import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './context.js';

/** Register all rulebook_workspace_* MCP tools on the given server.
 *  No-ops when `ctx.workspaceManager` is null (single-project mode). */
export function registerWorkspaceTools(server: McpServer, ctx: ToolContext): void {
    const { workspaceManager, getTaskMgr } = ctx;

    if (!workspaceManager) return;

    // Register tool: rulebook_workspace_list
    server.registerTool(
        'rulebook_workspace_list',
        {
            title: 'List Workspace Projects',
            description: 'List all projects in the current workspace',
            inputSchema: {},
        },
        async () => {
            const projects = workspaceManager.getProjects();
            const activeIds = workspaceManager.getActiveWorkerIds();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            workspace: workspaceManager.getConfig().name,
                            defaultProject: workspaceManager.getDefaultProjectId(),
                            projects: projects.map((p) => ({
                                name: p.name,
                                path: p.path,
                                workerActive: activeIds.includes(p.name),
                            })),
                            count: projects.length,
                        }),
                    },
                ],
            };
        }
    );

    // Register tool: rulebook_workspace_status
    server.registerTool(
        'rulebook_workspace_status',
        {
            title: 'Workspace Status',
            description: 'Get detailed status of all workspace projects (workers, tasks, memory)',
            inputSchema: {},
        },
        async () => {
            try {
                const status = await workspaceManager.getStatus();
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, ...status }) }],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ success: false, error: String(error) }),
                        },
                    ],
                };
            }
        }
    );

    // Register tool: rulebook_workspace_search
    server.registerTool(
        'rulebook_workspace_search',
        {
            title: 'Cross-Project Memory Search',
            description: 'Search memories across all projects in the workspace',
            inputSchema: {
                query: z.string().describe('Search query'),
                limit: z.number().optional().describe('Max results per project (default 10)'),
            },
        },
        async (args) => {
            try {
                const results = await workspaceManager.searchMemoryAcrossProjects(args.query, {
                    limit: args.limit,
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                results,
                                projectsSearched: results.length,
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ success: false, error: String(error) }),
                        },
                    ],
                };
            }
        }
    );

    // Register tool: rulebook_workspace_tasks
    server.registerTool(
        'rulebook_workspace_tasks',
        {
            title: 'List Tasks Across Projects',
            description: 'List tasks from all workspace projects',
            inputSchema: {
                status: z
                    .enum(['pending', 'in-progress', 'completed', 'blocked'])
                    .optional()
                    .describe('Filter by status'),
            },
        },
        async (args) => {
            try {
                const allTasks: Array<{ project: string; tasks: unknown[] }> = [];
                for (const project of workspaceManager.getProjects()) {
                    try {
                        const tm = await getTaskMgr(project.name);
                        const tasks = await tm.listTasks(false);
                        const filtered = args.status
                            ? tasks.filter((t) => t.status === args.status)
                            : tasks;
                        if (filtered.length > 0) {
                            allTasks.push({
                                project: project.name,
                                tasks: filtered.map((t) => ({
                                    id: t.id,
                                    title: t.title,
                                    status: t.status,
                                })),
                            });
                        }
                    } catch {
                        // Skip projects that fail
                    }
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                projects: allTasks,
                                totalTasks: allTasks.reduce((sum, p) => sum + p.tasks.length, 0),
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ success: false, error: String(error) }),
                        },
                    ],
                };
            }
        }
    );
}
