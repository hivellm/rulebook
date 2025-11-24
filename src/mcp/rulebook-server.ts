#!/usr/bin/env node

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import { TaskManager } from '../core/task-manager.js';

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
export function createRulebookMcpServer(projectRoot: string = process.cwd()): McpServer {
  const server = new McpServer({
    name: 'rulebook-task-management',
    version: '1.0.8',
  });

  // Initialize task manager
  const taskManager = new TaskManager(projectRoot, 'rulebook');

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
      outputSchema: z.object({
        success: z.boolean(),
        taskId: z.string(),
        message: z.string(),
        path: z.string().optional(),
      }),
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
      outputSchema: z.object({
        tasks: z.array(z.any()),
        count: z.number(),
      }),
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
      outputSchema: z.object({
        task: z.any().nullable(),
        found: z.boolean(),
      }),
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
      outputSchema: z.object({
        success: z.boolean(),
        taskId: z.string(),
        message: z.string(),
      }),
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
      outputSchema: z.object({
        valid: z.boolean(),
        errors: z.array(z.string()),
        warnings: z.array(z.string()),
      }),
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
      outputSchema: z.object({
        success: z.boolean(),
        taskId: z.string(),
        archivePath: z.string(),
        message: z.string(),
      }),
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
 * Start the MCP server with stdio transport (default) or HTTP transport
 * Following Context7 MCP server patterns: https://github.com/upstash/context7
 */
export async function startRulebookMcpServer(
  options: {
    projectRoot?: string;
    transport?: 'stdio' | 'http';
    port?: number;
  } = {}
): Promise<void> {
  const projectRoot = options.projectRoot || process.cwd();
  const transport = options.transport || (process.env.MCP_TRANSPORT as 'stdio' | 'http') || 'stdio';
  const port = options.port || parseInt(process.env.MCP_PORT || '3000');

  const server = createRulebookMcpServer(projectRoot);

  if (transport === 'http') {
    // Use HTTP transport (for remote HTTP server)
    const app = express();
    app.use(express.json());

    app.post('/mcp', async (req, res) => {
      // Create a new transport for each request to prevent request ID collisions
      const httpTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      res.on('close', () => {
        httpTransport.close();
      });

      try {
        await server.connect(httpTransport);
        await httpTransport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('MCP request error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });

    app
      .listen(port, () => {
        console.log(`Rulebook MCP Server running on http://localhost:${port}/mcp`);
        console.log(`Server ready to accept MCP requests`);
      })
      .on('error', (error: Error) => {
        console.error('Server error:', error);
        process.exit(1);
      });
  } else {
    // Use stdio transport (default for MCP clients that spawn the process)
    const stdioTransport = new StdioServerTransport();
    try {
      await server.connect(stdioTransport);
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      process.exit(1);
    }
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
  // Parse command line arguments (following Context7 pattern)
  let transport: 'stdio' | 'http' | undefined;
  let port: number | undefined;
  let projectRoot: string | undefined;

  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--transport' && process.argv[i + 1]) {
      transport = process.argv[i + 1] as 'stdio' | 'http';
    } else if (arg === '--port' && process.argv[i + 1]) {
      port = parseInt(process.argv[i + 1]);
    } else if (arg === '--project-root' && process.argv[i + 1]) {
      projectRoot = process.argv[i + 1];
    }
  }

  // Environment variables take precedence
  if (process.env.MCP_TRANSPORT) {
    transport = process.env.MCP_TRANSPORT as 'stdio' | 'http';
  }
  if (process.env.MCP_PORT) {
    port = parseInt(process.env.MCP_PORT);
  }

  startRulebookMcpServer({
    projectRoot,
    transport,
    port,
  }).catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}
