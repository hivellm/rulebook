#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TaskManager } from '../core/task-manager.js';
import { SkillsManager, getDefaultTemplatesPath } from '../core/skills-manager.js';
import { ConfigManager } from '../core/config-manager.js';
import { join, dirname, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import type { SkillCategory } from '../types.js';

// Find .rulebook file by walking up directories
export function findRulebookFile(startDir: string): string | null {
  let current = resolve(startDir);
  const root = resolve('/');

  while (current !== root) {
    const rulebookPath = join(current, '.rulebook');
    if (existsSync(rulebookPath)) {
      return rulebookPath;
    }
    current = dirname(current);
  }

  return null;
}

// Load configuration
function loadConfig() {
  const configPath = findRulebookFile(process.cwd());
  if (!configPath) {
    console.error('[rulebook-mcp] .rulebook not found. Run `rulebook mcp init` in your project.');
    process.exit(1);
  }

  const projectRoot = dirname(configPath);
  let config: any = {};

  try {
    const raw = readFileSync(configPath, 'utf8');
    config = JSON.parse(raw);
  } catch (error) {
    console.error(`[rulebook-mcp] Failed to parse .rulebook: ${error}`);
    process.exit(1);
  }

  const mcp = config.mcp || {};
  const tasksDir = resolve(projectRoot, mcp.tasksDir || 'rulebook/tasks');
  const archiveDir = resolve(projectRoot, mcp.archiveDir || 'rulebook/archive');

  return { projectRoot, tasksDir, archiveDir };
}

export async function startRulebookMcpServer(): Promise<void> {
  const config = loadConfig();
  const taskManager = new TaskManager(config.projectRoot, 'rulebook');
  const skillsManager = new SkillsManager(getDefaultTemplatesPath(), config.projectRoot);
  const configManager = new ConfigManager(config.projectRoot);

  const server = new McpServer({
    name: 'rulebook-task-management',
    version: '2.0.0',
  });

  // Register tool: rulebook_task_create
  server.registerTool(
    'rulebook_task_create',
    {
      title: 'Create Rulebook Task',
      description: 'Create a new Rulebook task',
      inputSchema: {
        taskId: z.string().describe('Task ID in kebab-case'),
      },
    },
    async (args) => {
      await taskManager.createTask(args.taskId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              taskId: args.taskId,
              message: `Task ${args.taskId} created successfully`,
            }),
          },
        ],
      };
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
      },
    },
    async (args) => {
      const tasks = await taskManager.listTasks(args.includeArchived || false);
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
      },
    },
    async (args) => {
      const task = await taskManager.showTask(args.taskId);
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
      },
    },
    async (args) => {
      if (args.status) {
        await taskManager.updateTaskStatus(args.taskId, args.status);
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              taskId: args.taskId,
              message: `Task ${args.taskId} updated successfully`,
            }),
          },
        ],
      };
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
      },
    },
    async (args) => {
      const validation = await taskManager.validateTask(args.taskId);
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
        taskId: z.string().describe('Task ID to archive'),
        skipValidation: z.boolean().optional().describe('Skip validation before archiving'),
      },
    },
    async (args) => {
      await taskManager.archiveTask(args.taskId, args.skipValidation || false);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              taskId: args.taskId,
              message: `Task ${args.taskId} archived successfully`,
            }),
          },
        ],
      };
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
      },
    },
    async (args) => {
      await taskManager.deleteTask(args.taskId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              taskId: args.taskId,
              message: `Task ${args.taskId} deleted successfully`,
            }),
          },
        ],
      };
    }
  );

  // ============================================
  // Skills Management Functions (v2.0)
  // ============================================

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
      },
    },
    async (args) => {
      try {
        let skills;
        if (args.category) {
          skills = await skillsManager.getSkillsByCategory(args.category as SkillCategory);
        } else {
          skills = await skillsManager.getSkills();
        }

        // Check enabled status from config
        const rulebookConfig = await configManager.loadConfig();
        const enabledIds = new Set(rulebookConfig.skills?.enabled || []);

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
      },
    },
    async (args) => {
      try {
        const skill = await skillsManager.getSkillById(args.skillId);

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

        const rulebookConfig = await configManager.loadConfig();
        const enabled = rulebookConfig.skills?.enabled?.includes(args.skillId) || false;

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
                    skill.content.slice(0, 2000) + (skill.content.length > 2000 ? '...' : ''),
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
      },
    },
    async (args) => {
      try {
        let rulebookConfig = await configManager.loadConfig();
        rulebookConfig = await skillsManager.enableSkill(args.skillId, rulebookConfig);
        await configManager.saveConfig(rulebookConfig);

        // Validate to check for conflicts
        const validation = await skillsManager.validateSkills(rulebookConfig);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                skillId: args.skillId,
                message: `Skill ${args.skillId} enabled successfully`,
                warnings: validation.warnings,
                conflicts: validation.conflicts,
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

  // Register tool: rulebook_skill_disable
  server.registerTool(
    'rulebook_skill_disable',
    {
      title: 'Disable Skill',
      description: 'Disable a skill in the project configuration',
      inputSchema: {
        skillId: z.string().describe('Skill ID to disable (e.g., languages/typescript)'),
      },
    },
    async (args) => {
      try {
        let rulebookConfig = await configManager.loadConfig();

        // Check if skill is enabled
        if (!rulebookConfig.skills?.enabled?.includes(args.skillId)) {
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

        rulebookConfig = await skillsManager.disableSkill(args.skillId, rulebookConfig);
        await configManager.saveConfig(rulebookConfig);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                skillId: args.skillId,
                message: `Skill ${args.skillId} disabled successfully`,
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

  // Register tool: rulebook_skill_search
  server.registerTool(
    'rulebook_skill_search',
    {
      title: 'Search Skills',
      description: 'Search for skills by name, description, or tags',
      inputSchema: {
        query: z.string().describe('Search query'),
      },
    },
    async (args) => {
      try {
        const skills = await skillsManager.searchSkills(args.query);
        const rulebookConfig = await configManager.loadConfig();
        const enabledIds = new Set(rulebookConfig.skills?.enabled || []);

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
      inputSchema: {},
    },
    async () => {
      try {
        const rulebookConfig = await configManager.loadConfig();
        const validation = await skillsManager.validateSkills(rulebookConfig);

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
                enabledCount: rulebookConfig.skills?.enabled?.length || 0,
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

  // ============================================
  // Memory System Functions (v2.2)
  // ============================================

  // Conditionally initialize MemoryManager
  let memoryManager: Awaited<ReturnType<typeof import('../memory/memory-manager.js').createMemoryManager>> | null = null;

  const rulebookConfig = await configManager.loadConfig();
  if (rulebookConfig.memory?.enabled) {
    try {
      const { createMemoryManager } = await import('../memory/memory-manager.js');
      memoryManager = createMemoryManager(config.projectRoot, rulebookConfig.memory);
    } catch {
      // Memory module not available
    }
  }

  function memoryNotEnabled() {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: 'Memory system is not enabled. Set memory.enabled=true in .rulebook',
          }),
        },
      ],
    };
  }

  // Register tool: rulebook_memory_search
  server.registerTool(
    'rulebook_memory_search',
    {
      title: 'Search Memories',
      description: 'Search persistent memories using hybrid BM25+vector search',
      inputSchema: {
        query: z.string().describe('Search query'),
        limit: z.number().optional().describe('Max results (default 20)'),
        mode: z.enum(['bm25', 'vector', 'hybrid']).optional().describe('Search mode'),
        type: z.string().optional().describe('Filter by memory type'),
      },
    },
    async (args) => {
      if (!memoryManager) return memoryNotEnabled();
      try {
        const results = await memoryManager.searchMemories({
          query: args.query,
          limit: args.limit,
          mode: args.mode,
          type: args.type as any,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, results, total: results.length }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: false, error: String(error) }) },
          ],
        };
      }
    }
  );

  // Register tool: rulebook_memory_timeline
  server.registerTool(
    'rulebook_memory_timeline',
    {
      title: 'Memory Timeline',
      description: 'Get chronological context around a specific memory',
      inputSchema: {
        memoryId: z.string().describe('Memory ID to anchor timeline'),
        window: z.number().optional().describe('Number of memories before/after (default 5)'),
      },
    },
    async (args) => {
      if (!memoryManager) return memoryNotEnabled();
      try {
        const timeline = await memoryManager.getTimeline(args.memoryId, args.window);
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, timeline }) },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: false, error: String(error) }) },
          ],
        };
      }
    }
  );

  // Register tool: rulebook_memory_get
  server.registerTool(
    'rulebook_memory_get',
    {
      title: 'Get Memory Details',
      description: 'Get full details for specific memory IDs',
      inputSchema: {
        ids: z.array(z.string()).describe('Memory IDs to fetch'),
      },
    },
    async (args) => {
      if (!memoryManager) return memoryNotEnabled();
      try {
        const memories = await memoryManager.getFullDetails(args.ids);
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, memories }) },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: false, error: String(error) }) },
          ],
        };
      }
    }
  );

  // Register tool: rulebook_memory_save
  server.registerTool(
    'rulebook_memory_save',
    {
      title: 'Save Memory',
      description: 'Save a new memory manually',
      inputSchema: {
        type: z.string().describe('Memory type (bugfix, feature, refactor, decision, discovery, change, observation)'),
        title: z.string().describe('Memory title'),
        content: z.string().describe('Memory content'),
        tags: z.array(z.string()).optional().describe('Tags'),
      },
    },
    async (args) => {
      if (!memoryManager) return memoryNotEnabled();
      try {
        const memory = await memoryManager.saveMemory({
          type: args.type as any,
          title: args.title,
          content: args.content,
          tags: args.tags,
        });
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, memory: { id: memory.id, type: memory.type, title: memory.title } }) },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: false, error: String(error) }) },
          ],
        };
      }
    }
  );

  // Register tool: rulebook_memory_stats
  server.registerTool(
    'rulebook_memory_stats',
    {
      title: 'Memory Statistics',
      description: 'Get memory database statistics',
      inputSchema: {},
    },
    async () => {
      if (!memoryManager) return memoryNotEnabled();
      try {
        const stats = await memoryManager.getStats();
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, stats }) },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: false, error: String(error) }) },
          ],
        };
      }
    }
  );

  // Register tool: rulebook_memory_cleanup
  server.registerTool(
    'rulebook_memory_cleanup',
    {
      title: 'Memory Cleanup',
      description: 'Force memory eviction and cleanup',
      inputSchema: {
        force: z.boolean().optional().describe('Force cleanup regardless of size'),
      },
    },
    async (args) => {
      if (!memoryManager) return memoryNotEnabled();
      try {
        const result = await memoryManager.cleanup(args.force ?? false);
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, ...result }) },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: false, error: String(error) }) },
          ],
        };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// If running directly, start the server
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.includes('rulebook-server')
) {
  startRulebookMcpServer().catch((error) => {
    console.error('[rulebook-mcp] Failed to start:', error);
    process.exit(1);
  });
}
