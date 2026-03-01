#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TaskManager } from '../core/task-manager.js';
import { SkillsManager, getDefaultTemplatesPath } from '../core/skills-manager.js';
import { ConfigManager } from '../core/config-manager.js';
import { join, dirname, resolve, basename } from 'path';
import { readFileSync, existsSync, statSync } from 'fs';
import type { SkillCategory } from '../types.js';

// Find .rulebook file/directory by walking up directories
export function findRulebookConfig(startDir: string): string | null {
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
  // Use --project-root flag as starting directory when provided
  const projectRootFlagIndex = process.argv.indexOf('--project-root');
  const startDir =
    projectRootFlagIndex !== -1 && process.argv[projectRootFlagIndex + 1]
      ? process.argv[projectRootFlagIndex + 1]
      : process.cwd();

  const rulebookPath = findRulebookConfig(startDir);
  if (!rulebookPath) {
    console.error('[rulebook-mcp] .rulebook not found. Run `rulebook mcp init` in your project.');
    process.exit(1);
  }

  const projectRoot = dirname(rulebookPath);
  let config: any = {};

  try {
    let configFilePath = rulebookPath;
    const stats = statSync(rulebookPath);

    // If .rulebook is a directory, read .rulebook/rulebook.json
    if (stats.isDirectory()) {
      configFilePath = join(rulebookPath, 'rulebook.json');
    }

    const raw = readFileSync(configFilePath, 'utf8');
    config = JSON.parse(raw);
  } catch (error) {
    console.error(`[rulebook-mcp] Failed to parse .rulebook: ${error}`);
    process.exit(1);
  }

  const mcp = config.mcp || {};
  const tasksDir = resolve(projectRoot, mcp.tasksDir || '.rulebook/tasks');
  const archiveDir = resolve(projectRoot, mcp.archiveDir || '.rulebook/archive');

  return { projectRoot, tasksDir, archiveDir };
}

export async function startRulebookMcpServer(): Promise<void> {
  const config = loadConfig();
  const taskManager = new TaskManager(config.projectRoot, '.rulebook');
  const skillsManager = new SkillsManager(getDefaultTemplatesPath(), config.projectRoot);
  const configManager = new ConfigManager(config.projectRoot);

  const server = new McpServer({
    name: 'rulebook-task-management',
    version: '4.0.0',
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
      const resultText = JSON.stringify({
        success: true,
        taskId: args.taskId,
        message: `Task ${args.taskId} created successfully`,
      });
      autoCapture('rulebook_task_create', args, resultText);
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
      const resultText = JSON.stringify({
        success: true,
        taskId: args.taskId,
        message: `Task ${args.taskId} updated successfully`,
      });
      autoCapture('rulebook_task_update', args, resultText);
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
      const resultText = JSON.stringify({
        success: true,
        taskId: args.taskId,
        message: `Task ${args.taskId} archived successfully`,
      });
      autoCapture('rulebook_task_archive', args, resultText);
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
      },
    },
    async (args) => {
      await taskManager.deleteTask(args.taskId);
      const resultText = JSON.stringify({
        success: true,
        taskId: args.taskId,
        message: `Task ${args.taskId} deleted successfully`,
      });
      autoCapture('rulebook_task_delete', args, resultText);
      return { content: [{ type: 'text', text: resultText }] };
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
  // Memory System Functions (v3.0)
  // ============================================

  // Conditionally initialize MemoryManager
  let memoryManager: Awaited<
    ReturnType<typeof import('../memory/memory-manager.js').createMemoryManager>
  > | null = null;
  let autoCaptureEnabled = false;

  const rulebookConfig = await configManager.loadConfig();
  if (rulebookConfig.memory?.enabled) {
    try {
      const { createMemoryManager } = await import('../memory/memory-manager.js');
      const memoryDbPath = join(
        config.projectRoot,
        rulebookConfig.memory.dbPath ?? '.rulebook/memory/memory.db'
      );
      console.error(`[rulebook-mcp] Memory DB: ${memoryDbPath}`);
      memoryManager = createMemoryManager(config.projectRoot, rulebookConfig.memory);
      autoCaptureEnabled = rulebookConfig.memory.autoCapture !== false; // enabled by default when memory is on
    } catch {
      // Memory module not available
    }
  }

  /**
   * Auto-capture: save tool interactions to memory in the background.
   * Fire-and-forget — never blocks or fails the original tool call.
   */
  async function autoCapture(
    toolName: string,
    args: Record<string, unknown>,
    resultText: string
  ): Promise<void> {
    if (!memoryManager || !autoCaptureEnabled) return;
    try {
      const { captureFromToolCall } = await import('../memory/memory-hooks.js');
      const captured = captureFromToolCall(toolName, args, resultText);
      if (!captured) return;
      await memoryManager.saveMemory({
        type: captured.type,
        title: captured.title,
        content: captured.content,
        tags: captured.tags,
      });
    } catch {
      // Never fail the original tool call
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
          content: [{ type: 'text', text: JSON.stringify({ success: true, timeline }) }],
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
          content: [{ type: 'text', text: JSON.stringify({ success: true, memories }) }],
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
        type: z
          .string()
          .describe(
            'Memory type (bugfix, feature, refactor, decision, discovery, change, observation)'
          ),
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
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                memory: { id: memory.id, type: memory.type, title: memory.title },
              }),
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
          content: [{ type: 'text', text: JSON.stringify({ success: true, stats }) }],
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
          content: [{ type: 'text', text: JSON.stringify({ success: true, ...result }) }],
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

  // Ralph Autonomous Loop Tools (v3.0)
  const ralphConfig = await configManager.loadConfig();
  const ralphEnabled = ralphConfig.ralph?.enabled ?? true;

  if (ralphEnabled) {
    // Register tool: rulebook_ralph_init
    server.registerTool(
      'rulebook_ralph_init',
      {
        title: 'Initialize Ralph',
        description: 'Initialize Ralph autonomous loop and create PRD from rulebook tasks',
        inputSchema: {},
      },
      async () => {
        try {
          const { Logger } = await import('../core/logger.js');
          const { RalphManager } = await import('../core/ralph-manager.js');
          const { PRDGenerator } = await import('../core/prd-generator.js');

          const logger = new Logger(config.projectRoot);
          const ralphManager = new RalphManager(config.projectRoot, logger);
          const prdGenerator = new PRDGenerator(config.projectRoot, logger);

          const configData = await configManager.loadConfig();
          const maxIterations = configData.ralph?.maxIterations || 10;
          const tool = (configData.ralph?.tool || 'claude') as 'claude' | 'amp' | 'gemini';

          // Generate PRD first, then initialize with correct task count
          const prd = await prdGenerator.generatePRD(basename(config.projectRoot) || 'project');

          const { writeFile } = await import('../utils/file-system.js');
          const prdPath = join(config.projectRoot, '.rulebook', 'ralph', 'prd.json');
          await writeFile(prdPath, JSON.stringify(prd, null, 2));

          // Initialize after PRD is written so task count is correct
          await ralphManager.initialize(maxIterations, tool);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: `Ralph initialized with ${prd.userStories.length} user stories`,
                  tasks: prd.userStories.length,
                  maxIterations,
                  tool,
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

    // Register tool: rulebook_ralph_run
    server.registerTool(
      'rulebook_ralph_run',
      {
        title: 'Run Ralph Loop',
        description: 'Execute Ralph autonomous iteration loop',
        inputSchema: {
          maxIterations: z.number().optional().describe('Maximum iterations'),
          tool: z.enum(['claude', 'amp', 'gemini']).optional().describe('AI tool to use'),
        },
      },
      async (args) => {
        try {
          const { Logger } = await import('../core/logger.js');
          const { RalphManager } = await import('../core/ralph-manager.js');
          const { RalphParser } = await import('../agents/ralph-parser.js');
          const { spawn } = await import('child_process');
          const { execSync } = await import('child_process');

          const logger = new Logger(config.projectRoot);
          const ralphManager = new RalphManager(config.projectRoot, logger);

          const configData = await configManager.loadConfig();
          const maxIterations = args.maxIterations || configData.ralph?.maxIterations || 10;
          const tool = (args.tool || configData.ralph?.tool || 'claude') as
            | 'claude'
            | 'amp'
            | 'gemini';

          // ── Concurrency guard: prevent multiple simultaneous Ralph runs ──
          const lockAcquired = await ralphManager.acquireLock(tool);
          if (!lockAcquired) {
            const lockInfo = await ralphManager.getLockInfo();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: `Ralph is already running (PID ${lockInfo?.pid}, started ${lockInfo?.startedAt}, task: ${lockInfo?.currentTask || 'starting'}, iteration: ${lockInfo?.iteration || 0}). Wait for it to finish or check ralph_status. Do NOT start another run.`,
                  }),
                },
              ],
            };
          }

          // Ensure lock is released on exit, even on crashes
          const cleanupLock = async () => {
            await ralphManager.releaseLock();
          };
          process.on('SIGTERM', cleanupLock);
          process.on('SIGINT', cleanupLock);

          try {
            // Validate tool is available before starting
            const toolCmdNames: Record<string, string> = {
              claude: 'claude',
              amp: 'amp',
              gemini: 'gemini',
            };
            const toolCmd = toolCmdNames[tool] || 'claude';
            try {
              execSync(`${toolCmd} --version`, { stdio: 'pipe', timeout: 10000 });
            } catch {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: `CLI tool "${toolCmd}" not found or not responding. Install it first: https://docs.anthropic.com/claude-code`,
                    }),
                  },
                ],
              };
            }

            // Resume existing state if available, otherwise initialize fresh
            const existingState = await ralphManager.getStatus();
            if (!existingState) {
              await ralphManager.initialize(maxIterations, tool);
            }

            // Helper: run a shell command and return stdout
            const runCmd = (
              cmd: string,
              cmdArgs: string[]
            ): Promise<{ code: number; stdout: string; stderr: string }> =>
              new Promise((resolve) => {
                let stdout = '';
                let stderr = '';
                const proc = spawn(cmd, cmdArgs, {
                  cwd: config.projectRoot,
                  shell: true,
                  stdio: ['pipe', 'pipe', 'pipe'],
                });
                proc.stdout?.on('data', (d: Buffer) => {
                  stdout += d.toString();
                });
                proc.stderr?.on('data', (d: Buffer) => {
                  stderr += d.toString();
                });
                proc.on('close', (code: number | null) =>
                  resolve({ code: code ?? 1, stdout, stderr })
                );
                proc.on('error', (err: Error) => resolve({ code: 1, stdout, stderr: err.message }));
              });

            // Helper: build prompt for AI agent
            const buildPrompt = (task: any, projectName: string): string => {
              const criteria = (task.acceptanceCriteria || [])
                .map((c: string) => `- ${c}`)
                .join('\n');
              return [
                `You are working on project: ${projectName}`,
                ``,
                `## Current Task: ${task.title}`,
                `ID: ${task.id}`,
                ``,
                `## Description`,
                task.description,
                ``,
                `## Acceptance Criteria`,
                criteria,
                ``,
                task.notes ? `## Notes\n${task.notes}\n` : '',
                `## Instructions`,
                `1. Implement the changes described above`,
                `2. Ensure all acceptance criteria are met`,
                `3. Run quality checks: type-check, lint, tests`,
                `4. Fix any issues found by quality checks`,
                `5. When done, summarize what was changed`,
              ]
                .filter(Boolean)
                .join('\n');
            };

            // Helper: execute AI agent with proper error handling
            const executeAgent = (agentTool: string, prompt: string): Promise<string> =>
              new Promise((resolve, reject) => {
                let output = '';
                let stderrOutput = '';
                const toolCmds: Record<
                  string,
                  { cmd: string; args: string[]; stdinPrompt: boolean }
                > = {
                  claude: {
                    cmd: 'claude',
                    args: ['-p', '--dangerously-skip-permissions', '--verbose'],
                    stdinPrompt: true,
                  },
                  amp: { cmd: 'amp', args: ['-p', prompt], stdinPrompt: false },
                  gemini: { cmd: 'gemini', args: ['-p', prompt], stdinPrompt: false },
                };
                const cfg = toolCmds[agentTool] || toolCmds.claude;

                let settled = false;
                const settle = (fn: () => void) => {
                  if (!settled) {
                    settled = true;
                    fn();
                  }
                };

                const proc = spawn(cfg.cmd, cfg.args, {
                  cwd: config.projectRoot,
                  shell: true,
                  stdio: ['pipe', 'pipe', 'pipe'],
                });

                if (cfg.stdinPrompt && proc.stdin) {
                  proc.stdin.write(prompt);
                  proc.stdin.end();
                }

                proc.stdout?.on('data', (d: Buffer) => {
                  output += d.toString();
                });
                proc.stderr?.on('data', (d: Buffer) => {
                  stderrOutput += d.toString();
                });

                proc.on('close', (code: number | null) => {
                  settle(() => {
                    if (code === 0 || output.length > 0) {
                      resolve(output);
                    } else {
                      reject(
                        new Error(
                          `Agent ${agentTool} exited with code ${code}${stderrOutput ? ': ' + stderrOutput.slice(0, 500) : ''}`
                        )
                      );
                    }
                  });
                });

                proc.on('error', (err: Error) => {
                  settle(() => reject(new Error(`Failed to spawn ${agentTool}: ${err.message}`)));
                });

                const timeout = setTimeout(() => {
                  proc.kill('SIGTERM');
                  settle(() => resolve(output || `Agent ${agentTool} timed out after 10 minutes`));
                }, 600000);

                proc.on('close', () => clearTimeout(timeout));
              });

            // Sync task count from PRD
            await ralphManager.refreshTaskCount();

            // Load PRD for project name (used in prompts)
            const prd = await ralphManager.loadPRD();
            if (!prd || !prd.userStories || prd.userStories.length === 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: 'No PRD found or no user stories. Run rulebook_ralph_init first.',
                    }),
                  },
                ],
              };
            }

            const projectName = prd.project || 'unknown';
            const totalTasks = prd.userStories.filter((s: any) => !s.passes).length;
            let iterationCount = 0;
            const iterationResults: Array<{
              iteration: number;
              taskId: string;
              taskTitle: string;
              status: string;
              durationMs: number;
            }> = [];

            // Log to stderr so MCP callers can see progress
            const logProgress = (msg: string) => {
              process.stderr.write(`[Ralph] ${msg}\n`);
            };

            logProgress(
              `Starting Ralph loop: ${totalTasks} pending tasks, max ${maxIterations} iterations, tool=${tool}`
            );

            while (ralphManager.canContinue() && iterationCount < maxIterations) {
              iterationCount++;
              const task = await ralphManager.getNextTask();
              if (!task) break;

              // Update lock with current progress
              await ralphManager.updateLockProgress(iterationCount, `${task.id}: ${task.title}`);

              logProgress(
                `Iteration ${iterationCount}/${maxIterations} — Task: ${task.id} "${task.title}"`
              );

              const startTime = Date.now();

              // 1. Execute AI agent
              let agentOutput = '';
              try {
                logProgress(`  Executing ${tool} agent...`);
                const prompt = buildPrompt(task, projectName);
                agentOutput = await executeAgent(tool, prompt);
                logProgress(`  Agent finished (${((Date.now() - startTime) / 1000).toFixed(0)}s)`);
              } catch (agentErr: any) {
                agentOutput = `Error: ${agentErr.message || agentErr}`;
                logProgress(`  Agent error: ${agentErr.message || agentErr}`);
              }

              // 2. Run quality gates
              logProgress(`  Running quality gates...`);
              const [typeCheck, lint, tests] = await Promise.all([
                runCmd('npm', ['run', 'type-check']).then((r) => r.code === 0),
                runCmd('npm', ['run', 'lint']).then((r) => r.code === 0),
                runCmd('npm', ['test']).then((r) => r.code === 0),
              ]);
              const qualityChecks = { type_check: typeCheck, lint, tests, coverage_met: tests };

              const allPass = typeCheck && lint && tests;
              const passCount = Object.values(qualityChecks).filter(Boolean).length;
              const status: 'success' | 'partial' | 'failed' = allPass
                ? 'success'
                : passCount >= 2
                  ? 'partial'
                  : 'failed';

              logProgress(
                `  Quality: type-check=${typeCheck ? 'PASS' : 'FAIL'} lint=${lint ? 'PASS' : 'FAIL'} tests=${tests ? 'PASS' : 'FAIL'} → ${status.toUpperCase()}`
              );

              // 3. Git commit if all gates pass
              let gitCommit: string | undefined;
              if (allPass) {
                await runCmd('git', ['add', '-A']);
                const commitResult = await runCmd('git', [
                  'commit',
                  '-m',
                  `ralph(${task.id}): ${task.title}\n\nIteration ${iterationCount} - Ralph autonomous loop`,
                ]);
                const hashMatch = commitResult.stdout.match(/\[[\w/.-]+ ([a-f0-9]+)\]/);
                gitCommit = hashMatch ? hashMatch[1] : undefined;
                await ralphManager.markStoryComplete(task.id);
                logProgress(`  Committed: ${gitCommit || 'no hash'} — Story ${task.id} COMPLETE`);
              }

              const iterDuration = Date.now() - startTime;

              // 4. Parse output for learnings/errors
              const parsed = RalphParser.parseAgentOutput(
                agentOutput,
                iterationCount,
                task.id,
                task.title,
                tool
              );

              // 5. Record iteration and refresh task count for canContinue()
              await ralphManager.recordIteration({
                iteration: iterationCount,
                timestamp: new Date().toISOString(),
                task_id: task.id,
                task_title: task.title,
                status,
                ai_tool: tool,
                execution_time_ms: iterDuration,
                quality_checks: qualityChecks,
                output_summary:
                  parsed.output_summary || `Iteration ${iterationCount}: ${task.title}`,
                git_commit: gitCommit,
                learnings: parsed.learnings,
                errors: parsed.errors,
                metadata: {
                  context_loss_count: parsed.metadata.context_loss_count,
                  parsed_completion: parsed.metadata.parsed_completion,
                },
              });

              iterationResults.push({
                iteration: iterationCount,
                taskId: task.id,
                taskTitle: task.title,
                status,
                durationMs: iterDuration,
              });

              // Refresh task count so canContinue() reflects updated PRD
              await ralphManager.refreshTaskCount();

              logProgress(
                `  Iteration ${iterationCount} complete (${(iterDuration / 1000).toFixed(0)}s)\n`
              );
            }

            const stats = await ralphManager.getTaskStats();
            logProgress(
              `Ralph loop finished: ${iterationCount} iterations, ${stats.completed}/${stats.total} tasks completed`
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    iterations: iterationCount,
                    completed: stats.completed,
                    total: stats.total,
                    results: iterationResults,
                  }),
                },
              ],
            };
          } finally {
            // Always release lock, even on error
            await ralphManager.releaseLock();
            process.removeListener('SIGTERM', cleanupLock);
            process.removeListener('SIGINT', cleanupLock);
          }
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

    // Register tool: rulebook_ralph_status
    server.registerTool(
      'rulebook_ralph_status',
      {
        title: 'Ralph Status',
        description: 'Get current Ralph loop status',
        inputSchema: {},
      },
      async () => {
        try {
          const { Logger } = await import('../core/logger.js');
          const { RalphManager } = await import('../core/ralph-manager.js');

          const logger = new Logger(config.projectRoot);
          const ralphManager = new RalphManager(config.projectRoot, logger);
          const status = await ralphManager.getStatus();

          if (!status) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: false, error: 'Ralph not initialized' }),
                },
              ],
            };
          }

          const stats = await ralphManager.getTaskStats();

          // Check if Ralph is currently running (lock held by alive process)
          const running = await ralphManager.isRunning();
          const lockInfo = running ? await ralphManager.getLockInfo() : null;

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  running,
                  ...(running && lockInfo
                    ? {
                        runningPid: lockInfo.pid,
                        runningTask: lockInfo.currentTask || null,
                        runningIteration: lockInfo.iteration || 0,
                        runningSince: lockInfo.startedAt,
                      }
                    : {}),
                  iteration: status.current_iteration,
                  maxIterations: status.max_iterations,
                  completedTasks: stats.completed,
                  totalTasks: stats.total,
                  paused: status.paused,
                  tool: status.tool,
                  startedAt: status.started_at,
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

    // Register tool: rulebook_ralph_get_iteration_history
    server.registerTool(
      'rulebook_ralph_get_iteration_history',
      {
        title: 'Ralph Iteration History',
        description: 'Get Ralph iteration history and statistics',
        inputSchema: {
          limit: z.number().optional().describe('Maximum iterations to return'),
          taskId: z.string().optional().describe('Filter by task ID'),
        },
      },
      async (args) => {
        try {
          const { Logger } = await import('../core/logger.js');
          const { IterationTracker } = await import('../core/iteration-tracker.js');

          const logger = new Logger(config.projectRoot);
          const tracker = new IterationTracker(config.projectRoot, logger);

          const history = await tracker.getHistory(args.limit || 10, args.taskId);
          const stats = await tracker.getStatistics();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  iterations: history.length,
                  history: history.map((iter) => ({
                    iteration: iter.iteration,
                    taskId: iter.task_id,
                    taskTitle: iter.task_title,
                    status: iter.status,
                    duration: iter.duration_ms,
                    qualityChecks: iter.quality_checks,
                    commit: iter.git_commit,
                  })),
                  statistics: {
                    total: stats.total_iterations,
                    successful: stats.successful_iterations,
                    failed: stats.failed_iterations,
                    successRate: (stats.success_rate * 100).toFixed(1) + '%',
                    avgDuration: stats.average_duration_ms,
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
                text: JSON.stringify({ success: false, error: String(error) }),
              },
            ],
          };
        }
      }
    );
  }

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
