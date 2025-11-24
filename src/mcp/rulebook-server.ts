#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
    version: '1.0.3',
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
        proposal: z
          .object({
            why: z.string().min(20).describe('Why this change is needed (minimum 20 characters)'),
            whatChanges: z.string().describe('Description of what will change'),
            impact: z
              .object({
                affectedSpecs: z.array(z.string()).optional(),
                affectedCode: z.array(z.string()).optional(),
                breakingChange: z.boolean(),
                userBenefit: z.string(),
              })
              .optional(),
          })
          .optional()
          .describe('Proposal content (optional, will use template if not provided)'),
      } as any,
      outputSchema: {
        success: z.boolean(),
        taskId: z.string(),
        message: z.string(),
        path: z.string().optional(),
      } as any,
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
        includeArchived: z.boolean().optional().default(false).describe('Include archived tasks'),
        status: z
          .enum(['pending', 'in-progress', 'completed', 'blocked'])
          .optional()
          .describe('Filter by status'),
      } as any,
      outputSchema: {
        tasks: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            status: z.enum(['pending', 'in-progress', 'completed', 'blocked']),
            createdAt: z.string(),
            updatedAt: z.string(),
            archivedAt: z.string().optional(),
          })
        ),
        count: z.number(),
      } as any,
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
      } as any,
      outputSchema: {
        task: z
          .object({
            id: z.string(),
            title: z.string(),
            status: z.enum(['pending', 'in-progress', 'completed', 'blocked']),
            proposal: z.string().optional(),
            tasks: z.string().optional(),
            design: z.string().optional(),
            specs: z.record(z.string(), z.string()).optional(),
            createdAt: z.string(),
            updatedAt: z.string(),
            archivedAt: z.string().optional(),
          })
          .nullable(),
        found: z.boolean(),
      } as any,
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
      } as any,
      outputSchema: {
        success: z.boolean(),
        taskId: z.string(),
        message: z.string(),
      } as any,
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
      } as any,
      outputSchema: {
        valid: z.boolean(),
        errors: z.array(z.string()),
        warnings: z.array(z.string()),
      } as any,
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
      } as any,
      outputSchema: {
        success: z.boolean(),
        taskId: z.string(),
        archivePath: z.string(),
        message: z.string(),
      } as any,
    },
    async (args: any, _extra?: any) => {
      return archiveTaskHandler(taskManager, args);
    }
  );

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startRulebookMcpServer(projectRoot?: string): Promise<void> {
  const server = createRulebookMcpServer(projectRoot || process.cwd());
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// If running directly (via npx or node), start the server
// Check if this file is being executed directly
const fileUrl = import.meta.url;
const isMainModule =
  fileUrl === `file://${process.argv[1]}` ||
  fileUrl.endsWith('rulebook-server.js') ||
  process.argv[1]?.includes('rulebook-server.js') ||
  process.argv[1]?.includes('rulebook-mcp');

if (isMainModule) {
  startRulebookMcpServer().catch(() => {
    // Don't use console.error - it breaks MCP stdio protocol
    // Errors will be handled by the transport layer
    process.exit(1);
  });
}
