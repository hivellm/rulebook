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
