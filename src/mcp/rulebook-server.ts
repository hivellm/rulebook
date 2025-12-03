#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TaskManager } from '../core/task-manager.js';
import { join, dirname, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

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

  const server = new McpServer({
    name: 'rulebook-task-management',
    version: '1.1.3',
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
