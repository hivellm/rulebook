import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './context.js';

/** Register all rulebook_learn_* MCP tools on the given server. */
export function registerLearnTools(server: McpServer, ctx: ToolContext): void {
    const { projectRoot, workspaceManager, projectIdSchema } = ctx;

    // Register tool: rulebook_learn_capture
    server.registerTool(
        'rulebook_learn_capture',
        {
            title: 'Capture Learning',
            description: 'Capture a learning or insight for future reference',
            inputSchema: {
                title: z.string().describe('Brief title for the learning'),
                content: z.string().describe('Full content of the learning'),
                tags: z.array(z.string()).optional().describe('Tags for search'),
                relatedTask: z.string().optional().describe('Related task ID'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const root =
                    args.projectId && workspaceManager
                        ? (await workspaceManager.getWorker(args.projectId)).projectRoot
                        : projectRoot;
                const { LearnManager } = await import('../../core/tasks/learn-manager.js');
                const lm = new LearnManager(root);
                const learning = await lm.capture(args.title, args.content, {
                    tags: args.tags,
                    relatedTask: args.relatedTask,
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ success: true, learning }),
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

    // Register tool: rulebook_learn_list
    server.registerTool(
        'rulebook_learn_list',
        {
            title: 'List Learnings',
            description: 'List captured learnings, newest first',
            inputSchema: {
                limit: z.number().optional().describe('Maximum number of learnings to return'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const root =
                    args.projectId && workspaceManager
                        ? (await workspaceManager.getWorker(args.projectId)).projectRoot
                        : projectRoot;
                const { LearnManager } = await import('../../core/tasks/learn-manager.js');
                const lm = new LearnManager(root);
                const learnings = await lm.list(args.limit);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                learnings,
                                count: learnings.length,
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

    // Register tool: rulebook_learn_promote
    server.registerTool(
        'rulebook_learn_promote',
        {
            title: 'Promote Learning',
            description: 'Promote a learning to a knowledge entry or decision record',
            inputSchema: {
                id: z.string().describe('Learning ID to promote'),
                target: z
                    .enum(['knowledge', 'decision'])
                    .describe('Promote to knowledge base or decision record'),
                title: z.string().optional().describe('Override title for the promoted entry'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const root =
                    args.projectId && workspaceManager
                        ? (await workspaceManager.getWorker(args.projectId)).projectRoot
                        : projectRoot;
                const { LearnManager } = await import('../../core/tasks/learn-manager.js');
                const lm = new LearnManager(root);
                const result = await lm.promote(args.id, args.target, { title: args.title });
                if (!result) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    error: `Learning "${args.id}" not found`,
                                }),
                            },
                        ],
                    };
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ success: true, promoted: result }),
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
