#!/usr/bin/env node

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { relative } from 'path';
import { TaskManager } from '../core/task-manager.js';
import { loadRulebookMCPConfig } from './rulebook-config.js';

// Debug helper - only logs to stderr when RULEBOOK_MCP_DEBUG=1
// MCP protocol requires stdout to be EXCLUSIVELY JSON-RPC 2.0 messages
// All logs, banners, emojis, etc. must go to stderr
const debug = (...args: unknown[]): void => {
  if (process.env.RULEBOOK_MCP_DEBUG === '1') {
    console.error('[rulebook-mcp]', ...args);
  }
};

// Import handlers
import { createTaskHandler } from './handlers/create-task.js';
import { listTasksHandler } from './handlers/list-tasks.js';
import { showTaskHandler } from './handlers/show-task.js';
import { updateTaskHandler } from './handlers/update-task.js';
import { validateTaskHandler } from './handlers/validate-task.js';
import { archiveTaskHandler } from './handlers/archive-task.js';

/**
 * Create and configure the Rulebook MCP server
 */
export function createRulebookMcpServer(options: {
  projectRoot: string;
  tasksDir: string;
  archiveDir: string;
}): McpServer {
  const server = new McpServer({
    name: 'rulebook-task-management',
    version: '1.1.1',
  });

  // Initialize task manager with custom paths from .rulebook config
  // TaskManager needs rulebookDir relative to projectRoot
  // Use synchronous path operations to avoid async delays before connect()
  const rulebookDir =
    relative(options.projectRoot, options.tasksDir).split(/[/\\]/)[0] || 'rulebook';
  const taskManager = new TaskManager(options.projectRoot, rulebookDir);

  // Register tool: rulebook_task_create
  server.registerTool(
    'rulebook_task_create',
    {
      title: 'Create Rulebook Task',
      description: 'Create a new Rulebook task with OpenSpec-compatible format',
      inputSchema: {
        taskId: z.string().describe('Task ID in kebab-case (e.g., add-feature-name)'),
        proposal: z.string().optional().describe('Proposal content as JSON string (optional)'),
      },
    },
    async (args: any, _extra?: any) => {
      return createTaskHandler(taskManager, args);
    }
  );

  // Register tool: rulebook_task_list
  server.registerTool(
    'rulebook_task_list',
    {
      title: 'List Rulebook Tasks',
      description: 'List all Rulebook tasks with optional filters',
      inputSchema: {
        includeArchived: z.boolean().optional().describe('Include archived tasks (default: false)'),
        status: z
          .enum(['pending', 'in-progress', 'completed', 'blocked'])
          .optional()
          .describe('Filter by status'),
      },
    },
    async (args: any, _extra?: any) => {
      return listTasksHandler(taskManager, args);
    }
  );

  // Register tool: rulebook_task_show
  server.registerTool(
    'rulebook_task_show',
    {
      title: 'Show Rulebook Task Details',
      description: 'Show detailed information about a specific task',
      inputSchema: {
        taskId: z.string().describe('Task ID to show'),
      },
    },
    async (args: any, _extra?: any) => {
      return showTaskHandler(taskManager, args);
    }
  );

  // Register tool: rulebook_task_update
  server.registerTool(
    'rulebook_task_update',
    {
      title: 'Update Rulebook Task',
      description: 'Update task status or progress',
      inputSchema: {
        taskId: z.string().describe('Task ID to update'),
        status: z
          .enum(['pending', 'in-progress', 'completed', 'blocked'])
          .optional()
          .describe('New status'),
        progress: z.number().min(0).max(100).optional().describe('Progress percentage (0-100)'),
      },
    },
    async (args: any, _extra?: any) => {
      return updateTaskHandler(taskManager, args);
    }
  );

  // Register tool: rulebook_task_validate
  server.registerTool(
    'rulebook_task_validate',
    {
      title: 'Validate Rulebook Task Format',
      description: 'Validate task format against OpenSpec-compatible requirements',
      inputSchema: {
        taskId: z.string().describe('Task ID to validate'),
      },
    },
    async (args: any, _extra?: any) => {
      return validateTaskHandler(taskManager, args);
    }
  );

  // Register tool: rulebook_task_archive
  server.registerTool(
    'rulebook_task_archive',
    {
      title: 'Archive Rulebook Task',
      description: 'Archive a completed task and apply spec deltas',
      inputSchema: {
        taskId: z.string().describe('Task ID to archive'),
        skipValidation: z
          .boolean()
          .optional()
          .default(false)
          .describe('Skip validation before archiving'),
      },
    },
    async (args: any, _extra?: any) => {
      return archiveTaskHandler(taskManager, args);
    }
  );

  // Register resources: task files (only active tasks, not archived)
  server.registerResource(
    'task-proposal',
    new ResourceTemplate('rulebook://task/{taskId}/proposal', {
      list: async () => {
        const tasks = await taskManager.listTasks(false); // Only active tasks
        return {
          resources: tasks.map((task) => ({
            uri: `rulebook://task/${task.id}/proposal`,
            name: `${task.id} - Proposal`,
            description: `Proposal document for task ${task.id}`,
            mimeType: 'text/markdown',
          })),
        };
      },
    }),
    {
      title: 'Task Proposal',
      description: 'Proposal document for a Rulebook task',
      mimeType: 'text/markdown',
    },
    async (uri, params) => {
      const taskId = typeof params.taskId === 'string' ? params.taskId : String(params.taskId);
      const task = await taskManager.loadTask(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: task.proposal || '',
          },
        ],
      };
    }
  );

  server.registerResource(
    'task-checklist',
    new ResourceTemplate('rulebook://task/{taskId}/tasks', {
      list: async () => {
        const tasks = await taskManager.listTasks(false); // Only active tasks
        return {
          resources: tasks.map((task) => ({
            uri: `rulebook://task/${task.id}/tasks`,
            name: `${task.id} - Tasks`,
            description: `Tasks checklist for task ${task.id}`,
            mimeType: 'text/markdown',
          })),
        };
      },
    }),
    {
      title: 'Task Checklist',
      description: 'Tasks checklist for a Rulebook task',
      mimeType: 'text/markdown',
    },
    async (uri, params) => {
      const taskId = typeof params.taskId === 'string' ? params.taskId : String(params.taskId);
      const task = await taskManager.loadTask(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: task.tasks || '',
          },
        ],
      };
    }
  );

  server.registerResource(
    'task-design',
    new ResourceTemplate('rulebook://task/{taskId}/design', {
      list: async () => {
        const tasks = await taskManager.listTasks(false); // Only active tasks
        return {
          resources: tasks
            .filter((task) => task.design)
            .map((task) => ({
              uri: `rulebook://task/${task.id}/design`,
              name: `${task.id} - Design`,
              description: `Design document for task ${task.id}`,
              mimeType: 'text/markdown',
            })),
        };
      },
    }),
    {
      title: 'Task Design',
      description: 'Design document for a Rulebook task',
      mimeType: 'text/markdown',
    },
    async (uri, params) => {
      const taskId = typeof params.taskId === 'string' ? params.taskId : String(params.taskId);
      const task = await taskManager.loadTask(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: task.design || '',
          },
        ],
      };
    }
  );

  return server;
}

/**
 * Start the MCP server with stdio transport
 * Following Context7 MCP server patterns: https://github.com/upstash/context7
 * Loads configuration from .rulebook file (found by walking up directories)
 */
export async function startRulebookMcpServer(): Promise<void> {
  // Load configuration from .rulebook file BEFORE creating server
  // This ensures all config is loaded synchronously before any async operations
  const mcpConfig = loadRulebookMCPConfig();

  // Create server instance and register all tools synchronously
  // Following cmmv-mcp pattern: register all tools BEFORE connecting transport
  const server = createRulebookMcpServer({
    projectRoot: mcpConfig.projectRoot,
    tasksDir: mcpConfig.tasksDir,
    archiveDir: mcpConfig.archiveDir,
  });

  // Use stdio transport (MCP standard)
  // CRITICAL: In stdio mode, stdout MUST contain ONLY JSON-RPC 2.0 messages
  // No logs, banners, emojis, or any other text output to stdout
  const stdioTransport = new StdioServerTransport();

  try {
    debug('Starting MCP server with stdio transport');
    debug(`Project root: ${mcpConfig.projectRoot}`);

    // Connect server to transport - this starts the MCP protocol handshake
    // Following cmmv-mcp pattern: connect AFTER all tools are registered
    // The server will wait for the client's initialize request before responding
    await server.connect(stdioTransport);

    // Server is now running and waiting for client requests
    // Do NOT log anything to stdout after this point
  } catch (error) {
    // Errors go to stderr, not stdout
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// If running directly (via npx or node), start the server
const fileUrl = import.meta.url;
const isMainModule =
  fileUrl === `file://${process.argv[1]}` ||
  fileUrl.endsWith('rulebook-server.js') ||
  process.argv[1]?.includes('rulebook-server.js') ||
  process.argv[1]?.includes('rulebook-mcp');

if (isMainModule) {
  // MCP server now loads config from .rulebook automatically
  // No need for command line arguments - .rulebook is the source of truth
  // Environment variables can override: RULEBOOK_CONFIG
  startRulebookMcpServer().catch((error) => {
    // Errors go to stderr, not stdout
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}
