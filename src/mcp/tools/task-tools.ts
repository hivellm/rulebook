import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './context.js';

/** Register all rulebook_task_* MCP tools on the given server. */
export function registerTaskTools(server: McpServer, ctx: ToolContext): void {
    const { projectIdSchema, getTaskMgr } = ctx;

    // Register tool: rulebook_task_create
    server.registerTool(
        'rulebook_task_create',
        {
            title: 'Create Rulebook Task',
            description: 'Create a new Rulebook task',
            inputSchema: {
                taskId: z
                    .string()
                    .describe(
                        'Task ID with phase prefix: phase<N>_<description> (e.g., phase1_add-user-auth, phase2a_fix-login-bug)'
                    ),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            const tm = await getTaskMgr(args.projectId);
            await tm.createTask(args.taskId);
            const resultText = JSON.stringify({
                success: true,
                taskId: args.taskId,
                message: `Task ${args.taskId} created successfully`,
            });
            return { content: [{ type: 'text', text: resultText }] };
        }
    );

    // Register tool: rulebook_task_list
    server.registerTool(
        'rulebook_task_list',
        {
            title: 'List Rulebook Tasks',
            description: 'List all Rulebook tasks',
            inputSchema: {
                includeArchived: z.boolean().optional().describe('Include archived tasks'),
                status: z
                    .enum(['pending', 'in-progress', 'completed', 'blocked'])
                    .optional()
                    .describe('Filter by status'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            const tm = await getTaskMgr(args.projectId);
            const tasks = await tm.listTasks(args.includeArchived || false);
            let filtered = tasks;
            if (args.status) {
                filtered = tasks.filter((t) => t.status === args.status);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            tasks: filtered.map((t) => ({
                                id: t.id,
                                title: t.title,
                                status: t.status,
                                createdAt: t.createdAt,
                                updatedAt: t.updatedAt,
                            })),
                            count: filtered.length,
                        }),
                    },
                ],
            };
        }
    );

    // Register tool: rulebook_task_show
    server.registerTool(
        'rulebook_task_show',
        {
            title: 'Show Rulebook Task',
            description: 'Show task details',
            inputSchema: {
                taskId: z.string().describe('Task ID to show'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            const tm = await getTaskMgr(args.projectId);
            const task = await tm.showTask(args.taskId);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            task: task
                                ? {
                                      id: task.id,
                                      title: task.title,
                                      status: task.status,
                                      proposal: task.proposal,
                                      tasks: task.tasks,
                                      design: task.design,
                                      specs: task.specs,
                                      createdAt: task.createdAt,
                                      updatedAt: task.updatedAt,
                                  }
                                : null,
                            found: task !== null,
                        }),
                    },
                ],
            };
        }
    );

    // Register tool: rulebook_task_update
    server.registerTool(
        'rulebook_task_update',
        {
            title: 'Update Rulebook Task',
            description: 'Update task status',
            inputSchema: {
                taskId: z.string().describe('Task ID to update'),
                status: z
                    .enum(['pending', 'in-progress', 'completed', 'blocked'])
                    .optional()
                    .describe('New status'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            const tm = await getTaskMgr(args.projectId);
            if (args.status) {
                await tm.updateTaskStatus(args.taskId, args.status);
            }
            const resultText = JSON.stringify({
                success: true,
                taskId: args.taskId,
                message: `Task ${args.taskId} updated successfully`,
            });
            return { content: [{ type: 'text', text: resultText }] };
        }
    );

    // Register tool: rulebook_task_validate
    server.registerTool(
        'rulebook_task_validate',
        {
            title: 'Validate Rulebook Task',
            description: 'Validate task format',
            inputSchema: {
                taskId: z.string().describe('Task ID to validate'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            const tm = await getTaskMgr(args.projectId);
            const validation = await tm.validateTask(args.taskId);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            valid: validation.valid,
                            errors: validation.errors,
                            warnings: validation.warnings,
                        }),
                    },
                ],
            };
        }
    );

    // Register tool: rulebook_task_archive
    server.registerTool(
        'rulebook_task_archive',
        {
            title: 'Archive Rulebook Task',
            description: 'Archive a completed task',
            inputSchema: {
                taskId: z
                    .string()
                    .describe('Task ID to archive (must use phase prefix, e.g., phase1_my-task)'),
                skipValidation: z.boolean().optional().describe('Skip validation before archiving'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            const tm = await getTaskMgr(args.projectId);
            await tm.archiveTask(args.taskId, args.skipValidation || false);
            const resultText = JSON.stringify({
                success: true,
                taskId: args.taskId,
                message: `Task ${args.taskId} archived successfully`,
            });
            return { content: [{ type: 'text', text: resultText }] };
        }
    );

    // Register tool: rulebook_task_delete
    server.registerTool(
        'rulebook_task_delete',
        {
            title: 'Delete Rulebook Task',
            description: 'Delete a task permanently',
            inputSchema: {
                taskId: z.string().describe('Task ID to delete'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            const tm = await getTaskMgr(args.projectId);
            await tm.deleteTask(args.taskId);
            const resultText = JSON.stringify({
                success: true,
                taskId: args.taskId,
                message: `Task ${args.taskId} deleted successfully`,
            });
            return { content: [{ type: 'text', text: resultText }] };
        }
    );
}
