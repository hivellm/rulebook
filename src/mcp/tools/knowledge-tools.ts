import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './context.js';

/** Register all rulebook_knowledge_* MCP tools on the given server. */
export function registerKnowledgeTools(server: McpServer, ctx: ToolContext): void {
    const { projectRoot, workspaceManager, projectIdSchema } = ctx;

    // Register tool: rulebook_knowledge_add
    server.registerTool(
        'rulebook_knowledge_add',
        {
            title: 'Add Knowledge Entry',
            description: 'Add a new pattern or anti-pattern to the project knowledge base',
            inputSchema: {
                type: z.string().describe('Knowledge type: "pattern" or "anti-pattern"'),
                title: z.string().describe('Entry title'),
                category: z
                    .string()
                    .describe('Category (e.g. code, architecture, testing, security)'),
                description: z.string().describe('Description of the pattern'),
                example: z.string().optional().describe('Code or usage example'),
                whenToUse: z.string().optional().describe('When to use this pattern'),
                whenNotToUse: z.string().optional().describe('When NOT to use this pattern'),
                tags: z.array(z.string()).optional().describe('Tags for search'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const root =
                    args.projectId && workspaceManager
                        ? (await workspaceManager.getWorker(args.projectId)).projectRoot
                        : projectRoot;
                const { KnowledgeManager } = await import('../../core/tasks/knowledge-manager.js');
                const km = new KnowledgeManager(root);
                const entry = await km.add(args.type as any, args.title, {
                    category: args.category as any,
                    description: args.description,
                    example: args.example,
                    whenToUse: args.whenToUse,
                    whenNotToUse: args.whenNotToUse,
                    tags: args.tags,
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ success: true, entry }),
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

    // Register tool: rulebook_knowledge_list
    server.registerTool(
        'rulebook_knowledge_list',
        {
            title: 'List Knowledge Entries',
            description: 'List patterns and anti-patterns in the project knowledge base',
            inputSchema: {
                type: z.string().optional().describe('Filter by type: "pattern" or "anti-pattern"'),
                category: z.string().optional().describe('Filter by category'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const root =
                    args.projectId && workspaceManager
                        ? (await workspaceManager.getWorker(args.projectId)).projectRoot
                        : projectRoot;
                const { KnowledgeManager } = await import('../../core/tasks/knowledge-manager.js');
                const km = new KnowledgeManager(root);
                const entries = await km.list(args.type as any, args.category as any);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ success: true, entries, count: entries.length }),
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

    // Register tool: rulebook_knowledge_show
    server.registerTool(
        'rulebook_knowledge_show',
        {
            title: 'Show Knowledge Entry',
            description: 'Show full details of a knowledge entry',
            inputSchema: {
                id: z.string().describe('Knowledge entry ID (slug)'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const root =
                    args.projectId && workspaceManager
                        ? (await workspaceManager.getWorker(args.projectId)).projectRoot
                        : projectRoot;
                const { KnowledgeManager } = await import('../../core/tasks/knowledge-manager.js');
                const km = new KnowledgeManager(root);
                const result = await km.show(args.id);
                if (!result) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    error: `Knowledge entry "${args.id}" not found`,
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
                                entry: result.entry,
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
}
