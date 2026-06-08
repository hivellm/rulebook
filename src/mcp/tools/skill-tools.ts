import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SkillCategory } from '../../types.js';
import type { ToolContext } from './context.js';

/** Register all rulebook_skill_* MCP tools on the given server. */
export function registerSkillTools(server: McpServer, ctx: ToolContext): void {
    const { projectIdSchema, getSkillsMgr, getConfigMgr, autoCapture } = ctx;

    // Register tool: rulebook_skill_list
    server.registerTool(
        'rulebook_skill_list',
        {
            title: 'List Available Skills',
            description: 'List all available skills, optionally filtered by category',
            inputSchema: {
                category: z
                    .enum([
                        'languages',
                        'frameworks',
                        'modules',
                        'services',
                        'workflows',
                        'ides',
                        'core',
                        'cli',
                        'git',
                        'hooks',
                    ])
                    .optional()
                    .describe('Filter by category'),
                enabledOnly: z.boolean().optional().describe('Show only enabled skills'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const sm = await getSkillsMgr(args.projectId);
                const cm = await getConfigMgr(args.projectId);
                let skills;
                if (args.category) {
                    skills = await sm.getSkillsByCategory(args.category as SkillCategory);
                } else {
                    skills = await sm.getSkills();
                }

                const rbConfig = await cm.loadConfig();
                const enabledIds = new Set(rbConfig.skills?.enabled || []);

                let filteredSkills = skills.map((s) => ({
                    id: s.id,
                    name: s.metadata.name,
                    description: s.metadata.description,
                    category: s.category,
                    enabled: enabledIds.has(s.id),
                    version: s.metadata.version,
                    tags: s.metadata.tags,
                }));

                if (args.enabledOnly) {
                    filteredSkills = filteredSkills.filter((s) => s.enabled);
                }

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                skills: filteredSkills,
                                count: filteredSkills.length,
                                category: args.category || 'all',
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
                                error: error instanceof Error ? error.message : 'Unknown error',
                            }),
                        },
                    ],
                };
            }
        }
    );

    // Register tool: rulebook_skill_show
    server.registerTool(
        'rulebook_skill_show',
        {
            title: 'Show Skill Details',
            description: 'Show detailed information about a specific skill',
            inputSchema: {
                skillId: z.string().describe('Skill ID (e.g., languages/typescript)'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const sm = await getSkillsMgr(args.projectId);
                const cm = await getConfigMgr(args.projectId);
                const skill = await sm.getSkillById(args.skillId);

                if (!skill) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    error: `Skill not found: ${args.skillId}`,
                                    suggestion: 'Use rulebook_skill_list to see available skills',
                                }),
                            },
                        ],
                    };
                }

                const rbConfig = await cm.loadConfig();
                const enabled = rbConfig.skills?.enabled?.includes(args.skillId) || false;

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                skill: {
                                    id: skill.id,
                                    name: skill.metadata.name,
                                    description: skill.metadata.description,
                                    category: skill.category,
                                    enabled,
                                    version: skill.metadata.version,
                                    author: skill.metadata.author,
                                    tags: skill.metadata.tags,
                                    dependencies: skill.metadata.dependencies,
                                    conflicts: skill.metadata.conflicts,
                                    content:
                                        skill.content.slice(0, 2000) +
                                        (skill.content.length > 2000 ? '...' : ''),
                                },
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
                                error: error instanceof Error ? error.message : 'Unknown error',
                            }),
                        },
                    ],
                };
            }
        }
    );

    // Register tool: rulebook_skill_enable
    server.registerTool(
        'rulebook_skill_enable',
        {
            title: 'Enable Skill',
            description: 'Enable a skill in the project configuration',
            inputSchema: {
                skillId: z.string().describe('Skill ID to enable (e.g., languages/typescript)'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const sm = await getSkillsMgr(args.projectId);
                const cm = await getConfigMgr(args.projectId);
                let rbConfig = await cm.loadConfig();
                rbConfig = await sm.enableSkill(args.skillId, rbConfig);
                await cm.saveConfig(rbConfig);

                const validation = await sm.validateSkills(rbConfig);

                const resultText = JSON.stringify({
                    success: true,
                    skillId: args.skillId,
                    message: `Skill ${args.skillId} enabled successfully`,
                    warnings: validation.warnings,
                    conflicts: validation.conflicts,
                });
                autoCapture('rulebook_skill_enable', args, resultText);
                return { content: [{ type: 'text', text: resultText }] };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                error: error instanceof Error ? error.message : 'Unknown error',
                            }),
                        },
                    ],
                };
            }
        }
    );

    // Register tool: rulebook_skill_disable
    server.registerTool(
        'rulebook_skill_disable',
        {
            title: 'Disable Skill',
            description: 'Disable a skill in the project configuration',
            inputSchema: {
                skillId: z.string().describe('Skill ID to disable (e.g., languages/typescript)'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const sm = await getSkillsMgr(args.projectId);
                const cm = await getConfigMgr(args.projectId);
                let rbConfig = await cm.loadConfig();

                if (!rbConfig.skills?.enabled?.includes(args.skillId)) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    error: `Skill ${args.skillId} is not currently enabled`,
                                }),
                            },
                        ],
                    };
                }

                rbConfig = await sm.disableSkill(args.skillId, rbConfig);
                await cm.saveConfig(rbConfig);

                const resultText = JSON.stringify({
                    success: true,
                    skillId: args.skillId,
                    message: `Skill ${args.skillId} disabled successfully`,
                });
                autoCapture('rulebook_skill_disable', args, resultText);
                return { content: [{ type: 'text', text: resultText }] };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                error: error instanceof Error ? error.message : 'Unknown error',
                            }),
                        },
                    ],
                };
            }
        }
    );

    // Register tool: rulebook_skill_search
    server.registerTool(
        'rulebook_skill_search',
        {
            title: 'Search Skills',
            description: 'Search for skills by name, description, or tags',
            inputSchema: {
                query: z.string().describe('Search query'),
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const sm = await getSkillsMgr(args.projectId);
                const cm = await getConfigMgr(args.projectId);
                const skills = await sm.searchSkills(args.query);
                const rbConfig = await cm.loadConfig();
                const enabledIds = new Set(rbConfig.skills?.enabled || []);

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                query: args.query,
                                skills: skills.map((s) => ({
                                    id: s.id,
                                    name: s.metadata.name,
                                    description: s.metadata.description,
                                    category: s.category,
                                    enabled: enabledIds.has(s.id),
                                })),
                                count: skills.length,
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
                                error: error instanceof Error ? error.message : 'Unknown error',
                            }),
                        },
                    ],
                };
            }
        }
    );

    // Register tool: rulebook_skill_validate
    server.registerTool(
        'rulebook_skill_validate',
        {
            title: 'Validate Skills Configuration',
            description: 'Validate the current skills configuration for conflicts and dependencies',
            inputSchema: {
                projectId: projectIdSchema,
            },
        },
        async (args) => {
            try {
                const sm = await getSkillsMgr(args.projectId);
                const cm = await getConfigMgr(args.projectId);
                const rbConfig = await cm.loadConfig();
                const validation = await sm.validateSkills(rbConfig);

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                valid: validation.valid,
                                errors: validation.errors,
                                warnings: validation.warnings,
                                conflicts: validation.conflicts,
                                enabledCount: rbConfig.skills?.enabled?.length || 0,
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
                                error: error instanceof Error ? error.message : 'Unknown error',
                            }),
                        },
                    ],
                };
            }
        }
    );
}
