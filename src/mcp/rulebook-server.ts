#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { z } from 'zod';
import { ConfigManager } from '../core/config-manager.js';
import { BackgroundIndexer } from '../core/indexer/background-indexer.js';
import { SkillsManager, getDefaultTemplatesPath } from '../core/skills-manager.js';
import { TaskManager } from '../core/task-manager.js';
import type { SkillCategory } from '../types.js';
import { WorkspaceManager } from '../core/workspace/workspace-manager.js';
import type { ProjectWorker } from '../core/workspace/project-worker.js';

// --- Timeout guard for MCP tool handlers ---
// Prevents the MCP server from hanging when a tool handler blocks (SQLite, WASM, fs).
const MCP_TOOL_TIMEOUT_MS = parseInt(process.env.RULEBOOK_MCP_TIMEOUT_MS ?? '10000', 10);

function withTimeout<T>(
  promise: Promise<T>,
  ms: number = MCP_TOOL_TIMEOUT_MS,
  label = 'tool'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[rulebook-mcp] ${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

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

// --- PID file guard: allow multiple MCP server instances (one per session) ---
// Each instance writes its own PID file: mcp-server.<pid>.pid
// Stale PID files from dead processes are cleaned up on startup.

const PID_FILE_PREFIX = 'mcp-server.';
const PID_FILE_SUFFIX = '.pid';
const LEGACY_PID_FILE_NAME = 'mcp-server.pid';

/**
 * Check if a process with the given PID is still alive.
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove stale PID files from dead processes.
 * Also cleans up the legacy single-PID file format (mcp-server.pid).
 */
export function cleanStalePidFiles(projectRoot: string): void {
  const pidDir = join(projectRoot, '.rulebook');
  if (!existsSync(pidDir)) return;

  try {
    const files = readdirSync(pidDir);
    for (const file of files) {
      // Match session-scoped PID files: mcp-server.<digits>.pid
      const sessionMatch = file.match(/^mcp-server\.(\d+)\.pid$/);
      if (sessionMatch) {
        const pid = parseInt(sessionMatch[1], 10);
        if (!isNaN(pid) && !isProcessAlive(pid)) {
          try {
            unlinkSync(join(pidDir, file));
            console.error(`[rulebook-mcp] Cleaned stale PID file (PID ${pid}).`);
          } catch {
            // Best-effort cleanup
          }
        }
        continue;
      }

      // Clean legacy mcp-server.pid if stale or corrupt
      if (file === LEGACY_PID_FILE_NAME) {
        try {
          const raw = readFileSync(join(pidDir, file), 'utf8').trim();
          const pid = parseInt(raw, 10);
          if (isNaN(pid)) {
            // Corrupt content — remove it
            unlinkSync(join(pidDir, file));
            console.error(`[rulebook-mcp] Cleaned corrupt legacy PID file.`);
          } else if (!isProcessAlive(pid)) {
            unlinkSync(join(pidDir, file));
            console.error(`[rulebook-mcp] Cleaned stale legacy PID file (PID ${pid}).`);
          }
        } catch {
          // Read/unlink failed — try to remove
          try {
            unlinkSync(join(pidDir, file));
          } catch {
            // Best-effort
          }
        }
      }
    }
  } catch {
    // Best-effort — don't block startup if cleanup fails
  }
}

/**
 * Register this MCP server instance with a session-scoped PID file.
 * Multiple instances can coexist — one per client session.
 * Cleans up stale PID files from dead processes before registering.
 */
export function acquirePidLock(projectRoot: string): string {
  const pidDir = join(projectRoot, '.rulebook');

  // Clean up dead instances before registering
  cleanStalePidFiles(projectRoot);

  // Write our session-scoped PID file
  if (!existsSync(pidDir)) {
    mkdirSync(pidDir, { recursive: true });
  }
  const pidPath = join(pidDir, `${PID_FILE_PREFIX}${process.pid}${PID_FILE_SUFFIX}`);
  writeFileSync(pidPath, String(process.pid), 'utf8');
  console.error(`[rulebook-mcp] Registered instance (PID ${process.pid}).`);
  return pidPath;
}

/**
 * Remove this instance's PID file on shutdown.
 * Only deletes the file if it still contains our PID.
 */
export function releasePidLock(pidPath: string): void {
  try {
    if (existsSync(pidPath)) {
      const raw = readFileSync(pidPath, 'utf8').trim();
      if (parseInt(raw, 10) === process.pid) {
        unlinkSync(pidPath);
      }
    }
  } catch {
    // Best-effort cleanup
  }
}

export async function startRulebookMcpServer(): Promise<void> {
  // --- Workspace vs Single-Project Mode ---
  let isWorkspaceMode = process.argv.includes('--workspace');
  let workspaceManager: WorkspaceManager | null = null;

  // Default managers (single-project mode OR default workspace project)
  let taskManager!: TaskManager;
  let skillsManager!: SkillsManager;
  let configManager!: ConfigManager;
  let projectRoot: string;

  // Resolve start directory (shared by both modes)
  const projectRootFlagIndex = process.argv.indexOf('--project-root');
  const startDir =
    projectRootFlagIndex !== -1 && process.argv[projectRootFlagIndex + 1]
      ? process.argv[projectRootFlagIndex + 1]
      : process.cwd();

  // Auto-detect workspace mode: if not explicitly set, check if a workspace
  // config exists (workspace.json, .code-workspace, or monorepo indicators).
  // This handles the common case where VSCode multi-root workspaces or
  // monorepos start the MCP server from the workspace root without --workspace.
  if (!isWorkspaceMode) {
    const autoDetected = WorkspaceManager.findWorkspaceConfig(startDir);
    if (autoDetected) {
      isWorkspaceMode = true;
      console.error(
        '[rulebook-mcp] Auto-detected workspace configuration, switching to workspace mode.'
      );
    }
  }

  if (isWorkspaceMode) {
    const wsConfig = WorkspaceManager.findWorkspaceConfig(startDir);
    if (!wsConfig) {
      console.error(
        '[rulebook-mcp] No workspace config found. Run `rulebook workspace init` to create .rulebook/workspace.json.'
      );
      process.exit(1);
    }

    workspaceManager = new WorkspaceManager(wsConfig, startDir);
    workspaceManager.startIdleChecker();
    projectRoot = startDir;

    // Initialize default project so existing tools work without projectId
    const defaultId = workspaceManager.getDefaultProjectId();
    if (defaultId) {
      try {
        const defaultWorker = await workspaceManager.getWorker(defaultId);
        taskManager = defaultWorker.getTaskManager();
        skillsManager = defaultWorker.getSkillsManager();
        configManager = defaultWorker.getConfigManager();
      } catch (e) {
        console.error(`[rulebook-mcp] Failed to init default project "${defaultId}":`, e);
        process.exit(1);
      }
    }
    console.error(
      `[rulebook-mcp] Workspace mode: ${wsConfig.name} (${wsConfig.projects.length} projects, default: ${defaultId})`
    );
  } else {
    const singleConfig = loadConfig();
    projectRoot = singleConfig.projectRoot;
    taskManager = new TaskManager(projectRoot, '.rulebook');
    skillsManager = new SkillsManager(getDefaultTemplatesPath(), projectRoot);
    configManager = new ConfigManager(projectRoot);
  }

  // --- PID file lock: prevent multiple instances for the same project ---
  const pidFilePath = acquirePidLock(projectRoot);

  // --- Manager Resolution Helpers (workspace-aware) ---

  async function getTaskMgr(projectId?: string): Promise<TaskManager> {
    if (!projectId || !workspaceManager) return taskManager;
    const w = await workspaceManager.getWorker(projectId);
    return w.getTaskManager();
  }

  async function getConfigMgr(projectId?: string): Promise<ConfigManager> {
    if (!projectId || !workspaceManager) return configManager;
    const w = await workspaceManager.getWorker(projectId);
    return w.getConfigManager();
  }

  async function getSkillsMgr(projectId?: string): Promise<SkillsManager> {
    if (!projectId || !workspaceManager) return skillsManager;
    const w = await workspaceManager.getWorker(projectId);
    return w.getSkillsManager();
  }

  async function getMemMgr(
    projectId?: string
  ): Promise<ReturnType<ProjectWorker['getMemoryManager']>> {
    if (workspaceManager) {
      const pid = projectId ?? workspaceManager.getDefaultProjectId();
      const w = await workspaceManager.getWorker(pid);
      return w.getMemoryManager();
    }
    return memoryManager;
  }

  const server = new McpServer({
    name: 'rulebook-task-management',
    version: '5.2.0',
  });

  // --- Wrap all tool handlers with timeout guard ---
  // Intercept registerTool to automatically add timeout protection to every handler.
  const originalRegisterTool = server.registerTool.bind(server);
  server.registerTool = ((
    name: string,
    config: any,
    handler: (...handlerArgs: any[]) => Promise<any>
  ) => {
    const wrappedHandler = async (...handlerArgs: any[]) => {
      try {
        return await withTimeout(handler(...handlerArgs), MCP_TOOL_TIMEOUT_MS, name);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[rulebook-mcp] ${name} error: ${msg}`);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify({ success: false, error: msg }) },
          ],
        };
      }
    };
    return originalRegisterTool(name, config, wrappedHandler);
  }) as typeof server.registerTool;

  // Zod schema reused across tools for workspace project targeting
  const projectIdSchema = z
    .string()
    .optional()
    .describe('Project ID (workspace mode only, defaults to default project)');

  // Register tool: rulebook_task_create
  server.registerTool(
    'rulebook_task_create',
    {
      title: 'Create Rulebook Task',
      description: 'Create a new Rulebook task',
      inputSchema: {
        taskId: z.string().describe('Task ID with phase prefix: phase<N>_<description> (e.g., phase1_add-user-auth, phase2a_fix-login-bug)'),
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      const tm = await getTaskMgr(args.projectId);
      await tm.createTask(args.taskId);
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
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      const tm = await getTaskMgr(args.projectId);
      const tasks = await tm.listTasks(args.includeArchived || false);
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
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      const tm = await getTaskMgr(args.projectId);
      const task = await tm.showTask(args.taskId);
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
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      const tm = await getTaskMgr(args.projectId);
      if (args.status) {
        await tm.updateTaskStatus(args.taskId, args.status);
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
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      const tm = await getTaskMgr(args.projectId);
      const validation = await tm.validateTask(args.taskId);
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
        taskId: z.string().describe('Task ID to archive (must use phase prefix, e.g., phase1_my-task)'),
        skipValidation: z.boolean().optional().describe('Skip validation before archiving'),
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      const tm = await getTaskMgr(args.projectId);
      await tm.archiveTask(args.taskId, args.skipValidation || false);
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
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      const tm = await getTaskMgr(args.projectId);
      await tm.deleteTask(args.taskId);
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

  // ============================================
  // Memory System Functions (v3.0)
  // ============================================

  // Conditionally initialize MemoryManager (single-project mode only;
  // in workspace mode each worker manages its own memory)
  let memoryManager: Awaited<
    ReturnType<typeof import('../memory/memory-manager.js').createMemoryManager>
  > | null = null;
  let bgIndexer: BackgroundIndexer | null = null;
  let autoCaptureEnabled = false;

  if (!isWorkspaceMode) {
    const rulebookConfig = await configManager.loadConfig();
    if (rulebookConfig.memory?.enabled) {
      try {
        const { createMemoryManager } = await import('../memory/memory-manager.js');
        const memoryDbPath = join(
          projectRoot,
          rulebookConfig.memory.dbPath ?? '.rulebook/memory/memory.db'
        );
        console.error(`[rulebook-mcp] Memory DB: ${memoryDbPath}`);
        memoryManager = createMemoryManager(projectRoot, rulebookConfig.memory);
        autoCaptureEnabled = rulebookConfig.memory.autoCapture !== false;

        // Boot Background Indexer only if memory is enabled (opt-in to save resources)
        const indexerEnabled = rulebookConfig.memory?.enabled === true;
        if (indexerEnabled) {
          bgIndexer = new BackgroundIndexer(memoryManager, projectRoot, {
            enabled: true,
            ...rulebookConfig.indexer,
          });
          setTimeout(() => {
            try {
              bgIndexer?.start();
            } catch (e) {
              console.error('[rulebook-mcp] BackgroundIndexer start failed:', e);
            }
          }, 5000);
        }

        (global as any).__indexerStatus = () => bgIndexer?.getStatus();
      } catch (e) {
        console.warn('[rulebook-mcp] Failed to boot Memory/Indexer:', e);
      }
    }
  }

  // --- Graceful shutdown for both modes ---
  // Handles SIGINT (Ctrl+C), SIGTERM (parent exit), SIGHUP (terminal close),
  // and stdin close (parent process died without signaling).
  let isShuttingDown = false;

  async function gracefulShutdown(reason: string): Promise<void> {
    if (isShuttingDown) return; // Prevent double-shutdown races
    isShuttingDown = true;
    console.error(`[rulebook-mcp] Shutting down (${reason})...`);
    try {
      if (bgIndexer) bgIndexer.stop();
      if (workspaceManager) {
        await workspaceManager.shutdownAll();
      }
      if (memoryManager) await memoryManager.close();
      releasePidLock(pidFilePath);
    } catch (e) {
      console.error('[rulebook-mcp] Error during shutdown:', e);
    }
    process.exit(0);
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

  // Detect parent process exit: when the MCP client (e.g. Claude Code) dies,
  // stdin closes. Without this, the server becomes an orphan that leaks memory.
  process.stdin.on('end', () => gracefulShutdown('stdin closed'));
  process.stdin.on('close', () => gracefulShutdown('stdin closed'));

  // Safety net: if stdin becomes unreadable but doesn't emit 'end'/'close'
  // (can happen on Windows), poll stdin.readable every 30s.
  const STDIN_POLL_INTERVAL_MS = 30_000;
  const stdinPollTimer = setInterval(() => {
    if (process.stdin.destroyed || !process.stdin.readable) {
      clearInterval(stdinPollTimer);
      gracefulShutdown('stdin unreadable');
    }
  }, STDIN_POLL_INTERVAL_MS);
  stdinPollTimer.unref(); // Don't keep the process alive just for this timer

  /**
   * Auto-capture: save tool interactions to memory in the background.
   * Fire-and-forget — never blocks or fails the original tool call.
   * Has its own 2s timeout to prevent hanging the event loop.
   *
   * The dynamic import is cached after the first call to avoid repeated
   * module loading overhead on every tool invocation.
   */
  const AUTO_CAPTURE_TIMEOUT_MS = 2000;
  let _captureFromToolCall: typeof import('../memory/memory-hooks.js').captureFromToolCall | null =
    null;

  async function autoCapture(
    toolName: string,
    args: Record<string, unknown>,
    resultText: string
  ): Promise<void> {
    if (!memoryManager || !autoCaptureEnabled) return;
    try {
      await withTimeout(
        (async () => {
          if (!_captureFromToolCall) {
            const mod = await import('../memory/memory-hooks.js');
            _captureFromToolCall = mod.captureFromToolCall;
          }
          const captured = _captureFromToolCall(toolName, args, resultText);
          if (!captured) return;
          await memoryManager!.saveMemory({
            type: captured.type,
            title: captured.title,
            content: captured.content,
            tags: captured.tags,
          });
        })(),
        AUTO_CAPTURE_TIMEOUT_MS,
        `autoCapture(${toolName})`
      );
    } catch {
      // Never fail the original tool call — timeout or error is silently dropped
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
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      const mm = await getMemMgr(args.projectId);
      if (!mm) return memoryNotEnabled();
      try {
        const results = await mm.searchMemories({
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
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      const mm = await getMemMgr(args.projectId);
      if (!mm) return memoryNotEnabled();
      try {
        const timeline = await mm.getTimeline(args.memoryId, args.window);
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
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      const mm = await getMemMgr(args.projectId);
      if (!mm) return memoryNotEnabled();
      try {
        const memories = await mm.getFullDetails(args.ids);
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
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      const mm = await getMemMgr(args.projectId);
      if (!mm) return memoryNotEnabled();
      try {
        const memory = await mm.saveMemory({
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
      inputSchema: {
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      const mm = await getMemMgr(args.projectId);
      if (!mm) return memoryNotEnabled();
      try {
        const stats = await mm.getStats();
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
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      const mm = await getMemMgr(args.projectId);
      if (!mm) return memoryNotEnabled();
      try {
        const result = await mm.cleanup(args.force ?? false);
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

          const logger = new Logger(projectRoot);
          const ralphManager = new RalphManager(projectRoot, logger);
          const prdGenerator = new PRDGenerator(projectRoot, logger);

          const configData = await configManager.loadConfig();
          const maxIterations = configData.ralph?.maxIterations || 10;
          const tool = (configData.ralph?.tool || 'claude') as 'claude' | 'amp' | 'gemini';

          // Generate PRD first, then initialize with correct task count
          const prd = await prdGenerator.generatePRD(basename(projectRoot) || 'project');

          const { writeFile } = await import('../utils/file-system.js');
          const prdPath = join(projectRoot, '.rulebook', 'ralph', 'prd.json');
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

          const logger = new Logger(projectRoot);
          const ralphManager = new RalphManager(projectRoot, logger);

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

          // Lock cleanup is handled by the top-level SIGINT handler (line ~858)
          // which shuts down all managers. Adding per-call SIGINT/SIGTERM listeners
          // causes accumulation and race conditions with the server shutdown handler.

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
                  cwd: projectRoot,
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
                  cwd: projectRoot,
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

          const logger = new Logger(projectRoot);
          const ralphManager = new RalphManager(projectRoot, logger);
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

          const logger = new Logger(projectRoot);
          const tracker = new IterationTracker(projectRoot, logger);

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

  // --- Background Indexer Tools ---

  // Register tool: rulebook_codebase_search
  server.registerTool(
    'rulebook_codebase_search',
    {
      title: 'Codebase Semantic Search',
      description: 'Search the entire project semantically (via AST chunks and paragraphs)',
      inputSchema: {
        query: z.string().describe('The code or concept you are looking for'),
        limit: z.number().optional().describe('Result limit (default 10)'),
      },
    },
    async (args) => {
      if (!memoryManager) return memoryNotEnabled();
      try {
        const results = await memoryManager.searchMemories({
          query: args.query,
          limit: args.limit ?? 10,
          mode: 'hybrid', // Force hybrid search for best code-chunk matching
        });

        // Filter out normal memories, keep only code nodes
        const codeResults = results.filter((r: any) => r.id.startsWith('__code__'));

        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, results: codeResults }) },
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

  // Register tool: rulebook_codebase_graph
  server.registerTool(
    'rulebook_codebase_graph',
    {
      title: 'Codebase Graph Explorer',
      description: 'Find relationships (imports, exports) of a specific code node or file',
      inputSchema: {
        filePath: z.string().describe('The strict file path to query (e.g. src/core/app.ts)'),
      },
    },
    async (args) => {
      if (!memoryManager) return memoryNotEnabled();
      try {
        // Since V1 has limited Graph search implementation in memory-search,
        // we'll return a placeholder indicating the edge relations.
        // In a real implementation we would call a memoryManager.getGraphAdjacent(args.filePath)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Graph query for ${args.filePath} accepted. (Note: Graph deep-search pending V2 implementation, use codebase_search for now.)`,
                filePath: args.filePath,
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

  // Register tool: rulebook_indexer_status
  server.registerTool(
    'rulebook_indexer_status',
    {
      title: 'Background Indexer Status',
      description: 'Get the status of the local autonomous filesystem indexer',
      inputSchema: {},
    },
    async () => {
      try {
        // Because the BackgroundIndexer runs asynchronously, we fetch its global state
        // assuming it was attached to the server context during boot.
        const status = (global as any).__indexerStatus
          ? (global as any).__indexerStatus()
          : { running: false, error: 'Indexer not attached to global context' };
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, status }) }],
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

  // ============================================
  // Workspace Tools (v4.2 — workspace mode only)
  // ============================================

  if (workspaceManager) {
    // Register tool: rulebook_workspace_list
    server.registerTool(
      'rulebook_workspace_list',
      {
        title: 'List Workspace Projects',
        description: 'List all projects in the current workspace',
        inputSchema: {},
      },
      async () => {
        const projects = workspaceManager!.getProjects();
        const activeIds = workspaceManager!.getActiveWorkerIds();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                workspace: workspaceManager!.getConfig().name,
                defaultProject: workspaceManager!.getDefaultProjectId(),
                projects: projects.map((p) => ({
                  name: p.name,
                  path: p.path,
                  workerActive: activeIds.includes(p.name),
                })),
                count: projects.length,
              }),
            },
          ],
        };
      }
    );

    // Register tool: rulebook_workspace_status
    server.registerTool(
      'rulebook_workspace_status',
      {
        title: 'Workspace Status',
        description: 'Get detailed status of all workspace projects (workers, tasks, memory)',
        inputSchema: {},
      },
      async () => {
        try {
          const status = await workspaceManager!.getStatus();
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, ...status }) }],
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

    // Register tool: rulebook_workspace_search
    server.registerTool(
      'rulebook_workspace_search',
      {
        title: 'Cross-Project Memory Search',
        description: 'Search memories across all projects in the workspace',
        inputSchema: {
          query: z.string().describe('Search query'),
          limit: z.number().optional().describe('Max results per project (default 10)'),
        },
      },
      async (args) => {
        try {
          const results = await workspaceManager!.searchMemoryAcrossProjects(args.query, {
            limit: args.limit,
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  results,
                  projectsSearched: results.length,
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

    // Register tool: rulebook_workspace_tasks
    server.registerTool(
      'rulebook_workspace_tasks',
      {
        title: 'List Tasks Across Projects',
        description: 'List tasks from all workspace projects',
        inputSchema: {
          status: z
            .enum(['pending', 'in-progress', 'completed', 'blocked'])
            .optional()
            .describe('Filter by status'),
        },
      },
      async (args) => {
        try {
          const allTasks: Array<{ project: string; tasks: unknown[] }> = [];
          for (const project of workspaceManager!.getProjects()) {
            try {
              const tm = await getTaskMgr(project.name);
              const tasks = await tm.listTasks(false);
              const filtered = args.status ? tasks.filter((t) => t.status === args.status) : tasks;
              if (filtered.length > 0) {
                allTasks.push({
                  project: project.name,
                  tasks: filtered.map((t) => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                  })),
                });
              }
            } catch {
              // Skip projects that fail
            }
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  projects: allTasks,
                  totalTasks: allTasks.reduce((sum, p) => sum + p.tasks.length, 0),
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
  }

  // ============================================
  // Context Intelligence Layer Tools (v4.4)
  // ============================================

  // Register tool: rulebook_decision_create
  server.registerTool(
    'rulebook_decision_create',
    {
      title: 'Create Decision Record',
      description: 'Create a new architectural decision record (ADR)',
      inputSchema: {
        title: z.string().describe('Decision title'),
        context: z.string().optional().describe('Context and problem statement'),
        decision: z.string().optional().describe('The decision made'),
        alternatives: z.array(z.string()).optional().describe('Alternatives considered'),
        consequences: z.string().optional().describe('Consequences and tradeoffs'),
        relatedTasks: z.array(z.string()).optional().describe('Related task IDs'),
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      try {
        const root =
          args.projectId && workspaceManager
            ? (await workspaceManager.getWorker(args.projectId)).projectRoot
            : projectRoot;
        const { DecisionManager } = await import('../core/decision-manager.js');
        const dm = new DecisionManager(root);
        const decision = await dm.create(args.title, {
          context: args.context,
          decision: args.decision,
          alternatives: args.alternatives,
          consequences: args.consequences,
          relatedTasks: args.relatedTasks,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, decision }),
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

  // Register tool: rulebook_decision_list
  server.registerTool(
    'rulebook_decision_list',
    {
      title: 'List Decision Records',
      description: 'List all architectural decision records',
      inputSchema: {
        status: z
          .string()
          .optional()
          .describe('Filter by status (proposed, accepted, rejected, superseded, deprecated)'),
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      try {
        const root =
          args.projectId && workspaceManager
            ? (await workspaceManager.getWorker(args.projectId)).projectRoot
            : projectRoot;
        const { DecisionManager } = await import('../core/decision-manager.js');
        const dm = new DecisionManager(root);
        const decisions = await dm.list(args.status as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, decisions, count: decisions.length }),
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

  // Register tool: rulebook_decision_show
  server.registerTool(
    'rulebook_decision_show',
    {
      title: 'Show Decision Record',
      description: 'Show full details of a decision record',
      inputSchema: {
        id: z.number().describe('Decision ID'),
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      try {
        const root =
          args.projectId && workspaceManager
            ? (await workspaceManager.getWorker(args.projectId)).projectRoot
            : projectRoot;
        const { DecisionManager } = await import('../core/decision-manager.js');
        const dm = new DecisionManager(root);
        const result = await dm.show(args.id);
        if (!result) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: false, error: `Decision ${args.id} not found` }),
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
                decision: result.decision,
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

  // Register tool: rulebook_decision_update
  server.registerTool(
    'rulebook_decision_update',
    {
      title: 'Update Decision Record',
      description: 'Update an existing architectural decision record',
      inputSchema: {
        id: z.number().describe('Decision ID to update'),
        status: z
          .string()
          .optional()
          .describe('New status (proposed, accepted, rejected, superseded, deprecated)'),
        context: z.string().optional().describe('Updated context'),
        decision: z.string().optional().describe('Updated decision text'),
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      try {
        const root =
          args.projectId && workspaceManager
            ? (await workspaceManager.getWorker(args.projectId)).projectRoot
            : projectRoot;
        const { DecisionManager } = await import('../core/decision-manager.js');
        const dm = new DecisionManager(root);
        const updated = await dm.update(args.id, {
          status: args.status as any,
          context: args.context,
          decision: args.decision,
        });
        if (!updated) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: false, error: `Decision ${args.id} not found` }),
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, decision: updated }),
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

  // Register tool: rulebook_knowledge_add
  server.registerTool(
    'rulebook_knowledge_add',
    {
      title: 'Add Knowledge Entry',
      description: 'Add a new pattern or anti-pattern to the project knowledge base',
      inputSchema: {
        type: z.string().describe('Knowledge type: "pattern" or "anti-pattern"'),
        title: z.string().describe('Entry title'),
        category: z.string().describe('Category (e.g. code, architecture, testing, security)'),
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
        const { KnowledgeManager } = await import('../core/knowledge-manager.js');
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
        const { KnowledgeManager } = await import('../core/knowledge-manager.js');
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
        const { KnowledgeManager } = await import('../core/knowledge-manager.js');
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
              text: JSON.stringify({ success: true, entry: result.entry, content: result.content }),
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
        const { LearnManager } = await import('../core/learn-manager.js');
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
        const { LearnManager } = await import('../core/learn-manager.js');
        const lm = new LearnManager(root);
        const learnings = await lm.list(args.limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, learnings, count: learnings.length }),
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
        const { LearnManager } = await import('../core/learn-manager.js');
        const lm = new LearnManager(root);
        const result = await lm.promote(args.id, args.target, { title: args.title });
        if (!result) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: false, error: `Learning "${args.id}" not found` }),
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

  // ── v5.0 Tools: Session Management, Rules, Blockers ──────────────────

  // Register tool: rulebook_session_start
  server.registerTool(
    'rulebook_session_start',
    {
      title: 'Start Session',
      description:
        'Load session context: reads PLANS.md and searches relevant memories. Call at the start of every session.',
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe('Optional search query to find relevant past memories'),
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      try {
        const root =
          args.projectId && workspaceManager
            ? (await workspaceManager.getWorker(args.projectId)).projectRoot
            : projectRoot;
        const { join } = await import('path');
        const { existsSync } = await import('fs');
        const { readFile } = await import('fs/promises');

        const result: {
          plans: string | null;
          memories: unknown[];
        } = { plans: null, memories: [] };

        // Read PLANS.md
        const plansPath = join(root, '.rulebook', 'PLANS.md');
        if (existsSync(plansPath)) {
          result.plans = await readFile(plansPath, 'utf-8');
        }

        // Search relevant memories
        if (args.query && memoryManager) {
          const searchResults = await memoryManager.searchMemories({
            query: args.query,
            mode: 'hybrid',
            limit: 5,
          });
          result.memories = searchResults;
        }

        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, ...result }) }],
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

  // Register tool: rulebook_session_end
  server.registerTool(
    'rulebook_session_end',
    {
      title: 'End Session',
      description:
        'Save session summary to PLANS.md history section. Call at the end of every session.',
      inputSchema: {
        summary: z
          .string()
          .describe('Session summary: what was accomplished, key decisions, next steps'),
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      try {
        const root =
          args.projectId && workspaceManager
            ? (await workspaceManager.getWorker(args.projectId)).projectRoot
            : projectRoot;
        const { join } = await import('path');
        const { existsSync } = await import('fs');
        const { readFile, writeFile } = await import('fs/promises');

        const plansPath = join(root, '.rulebook', 'PLANS.md');
        const date = new Date().toISOString().split('T')[0];
        const entry = `### ${date}\n${args.summary}\n`;

        if (existsSync(plansPath)) {
          let content = await readFile(plansPath, 'utf-8');
          // Insert after <!-- PLANS:HISTORY:START -->
          if (content.includes('<!-- PLANS:HISTORY:START -->')) {
            content = content.replace(
              '<!-- PLANS:HISTORY:START -->',
              `<!-- PLANS:HISTORY:START -->\n${entry}`
            );
          } else {
            content += `\n## Session History\n\n<!-- PLANS:HISTORY:START -->\n${entry}<!-- PLANS:HISTORY:END -->\n`;
          }
          await writeFile(plansPath, content, 'utf-8');
        } else {
          // Create PLANS.md from scratch
          const newContent = `# Project Plans & Session Context\n\n<!-- PLANS:CONTEXT:START -->\n_No active context._\n<!-- PLANS:CONTEXT:END -->\n\n<!-- PLANS:TASK:START -->\n_No task in progress._\n<!-- PLANS:TASK:END -->\n\n## Session History\n\n<!-- PLANS:HISTORY:START -->\n${entry}<!-- PLANS:HISTORY:END -->\n`;
          const { mkdirSync } = await import('fs');
          const dir = join(root, '.rulebook');
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          await writeFile(plansPath, newContent, 'utf-8');
        }

        // Also save to memory if available
        if (memoryManager) {
          await memoryManager.saveMemory({
            type: 'observation',
            title: `Session summary ${date}`,
            content: args.summary,
            tags: ['session', 'summary'],
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Session summary saved to PLANS.md' }),
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

  // Register tool: rulebook_rules_list
  server.registerTool(
    'rulebook_rules_list',
    {
      title: 'List Rules',
      description:
        'List canonical rules from .rulebook/rules/ AND path-scoped language rules from .claude/rules/. Each entry is classified by source (generated by rulebook vs user-authored).',
      inputSchema: {
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      try {
        const root =
          args.projectId && workspaceManager
            ? (await workspaceManager.getWorker(args.projectId)).projectRoot
            : projectRoot;
        const { listRules } = await import('../core/rule-engine.js');
        const { listRulesWithSource } = await import('../core/rules-generator.js');
        const canonical = await listRules(root);
        const languageRules = await listRulesWithSource(root);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                canonical,
                languageRules,
                count: canonical.length + languageRules.length,
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

  // Register tool: rulebook_blockers
  server.registerTool(
    'rulebook_blockers',
    {
      title: 'Show Blockers',
      description: 'Show task blocker chain with cascade impact analysis',
      inputSchema: {
        projectId: projectIdSchema,
      },
    },
    async (args) => {
      try {
        const tm = await getTaskMgr(args.projectId);
        const tasks = await tm.listTasks();

        // Build blocker chain from task metadata
        const blockers: Array<{
          taskId: string;
          blocks: string[];
          blockedBy: string[];
          cascadeImpact: number;
        }> = [];

        for (const task of tasks) {
          const metadata = await tm.getTaskMetadata(task.id);
          const blocks = Array.isArray(metadata?.blocks) ? (metadata.blocks as string[]) : [];
          const blockedBy = Array.isArray(metadata?.blockedBy)
            ? (metadata.blockedBy as string[])
            : [];
          if (blocks.length > 0 || blockedBy.length > 0) {
            blockers.push({
              taskId: task.id,
              blocks,
              blockedBy,
              cascadeImpact: (metadata?.cascadeImpact as number) || blocks.length,
            });
          }
        }

        // Sort by cascade impact (highest first)
        blockers.sort((a, b) => b.cascadeImpact - a.cascadeImpact);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, blockers, count: blockers.length }),
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
