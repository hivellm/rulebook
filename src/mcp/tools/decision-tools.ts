import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './context.js';

/** Register all rulebook_decision_* MCP tools on the given server. */
export function registerDecisionTools(server: McpServer, ctx: ToolContext): void {
    const { projectRoot, workspaceManager, projectIdSchema } = ctx;

    // Register tool: rulebook_decision_create
    server.registerTool(
        'rulebook_decision_create',
        {
            title: 'Create Decision Record',
            description: 'Create a new architectural decision record (ADR)',
            inputSchema: {
                title: z.string().describe('Decision title'),
                context: z.string().optional().describe('Context and problem statement'),
                decision: z.string().optional().describe('The decision made'),
                alternatives: z.array(z.string()).optional().describe('Alternatives considered'),
                consequences: z.string().optional().describe('Consequences and tradeoffs'),
                relatedTasks: z.array(z.string()).optional().describe('Related task IDs'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const root =
                    args.projectId && workspaceManager
                        ? (await workspaceManager.getWorker(args.projectId)).projectRoot
                        : projectRoot;
                const { DecisionManager } = await import('../../core/tasks/decision-manager.js');
                const dm = new DecisionManager(root);
                const decision = await dm.create(args.title, {
                    context: args.context,
                    decision: args.decision,
                    alternatives: args.alternatives,
                    consequences: args.consequences,
                    relatedTasks: args.relatedTasks,
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ success: true, decision }),
                        },
                    ],
                };
            } catch (error) {
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
        }
    );

    // Register tool: rulebook_decision_list
    server.registerTool(
        'rulebook_decision_list',
        {
            title: 'List Decision Records',
            description: 'List all architectural decision records',
            inputSchema: {
                status: z
                    .string()
                    .optional()
                    .describe(
                        'Filter by status (proposed, accepted, rejected, superseded, deprecated)'
                    ),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const root =
                    args.projectId && workspaceManager
                        ? (await workspaceManager.getWorker(args.projectId)).projectRoot
                        : projectRoot;
                const { DecisionManager } = await import('../../core/tasks/decision-manager.js');
                const dm = new DecisionManager(root);
                const decisions = await dm.list(args.status as any);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                decisions,
                                count: decisions.length,
                            }),
                        },
                    ],
                };
            } catch (error) {
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
        }
    );

    // Register tool: rulebook_decision_show
    server.registerTool(
        'rulebook_decision_show',
        {
            title: 'Show Decision Record',
            description: 'Show full details of a decision record',
            inputSchema: {
                id: z.number().describe('Decision ID'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const root =
                    args.projectId && workspaceManager
                        ? (await workspaceManager.getWorker(args.projectId)).projectRoot
                        : projectRoot;
                const { DecisionManager } = await import('../../core/tasks/decision-manager.js');
                const dm = new DecisionManager(root);
                const result = await dm.show(args.id);
                if (!result) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    error: `Decision ${args.id} not found`,
                                }),
                            },
                        ],
                    };
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                decision: result.decision,
                                content: result.content,
                            }),
                        },
                    ],
                };
            } catch (error) {
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
        }
    );

    // Register tool: rulebook_decision_update
    server.registerTool(
        'rulebook_decision_update',
        {
            title: 'Update Decision Record',
            description: 'Update an existing architectural decision record',
            inputSchema: {
                id: z.number().describe('Decision ID to update'),
                status: z
                    .string()
                    .optional()
                    .describe('New status (proposed, accepted, rejected, superseded, deprecated)'),
                context: z.string().optional().describe('Updated context'),
                decision: z.string().optional().describe('Updated decision text'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const root =
                    args.projectId && workspaceManager
                        ? (await workspaceManager.getWorker(args.projectId)).projectRoot
                        : projectRoot;
                const { DecisionManager } = await import('../../core/tasks/decision-manager.js');
                const dm = new DecisionManager(root);
                const updated = await dm.update(args.id, {
                    status: args.status as any,
                    context: args.context,
                    decision: args.decision,
                });
                if (!updated) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    error: `Decision ${args.id} not found`,
                                }),
                            },
                        ],
                    };
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ success: true, decision: updated }),
                        },
                    ],
                };
            } catch (error) {
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
        }
    );
}
