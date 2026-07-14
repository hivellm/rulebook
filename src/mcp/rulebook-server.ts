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
import { dirname, join, resolve } from 'path';
import { z } from 'zod';
import { ConfigManager } from '../core/state/config-manager.js';
import { SkillsManager, getDefaultTemplatesPath } from '../core/skills/skills-manager.js';
import { TaskManager } from '../core/tasks/task-manager.js';
import { WorkspaceManager } from '../core/workspace/workspace-manager.js';
import type { ToolContext } from './tools/context.js';
import { registerV7Tools } from './tools/v7-tools.js';

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
        console.error(
            '[rulebook-mcp] .rulebook not found. Run `rulebook mcp init` in your project.'
        );
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

    const server = new McpServer({
        name: 'rulebook',
        version: '7.0.0',
    });

    // --- Wrap all tool handlers with a timeout guard ---
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
                        {
                            type: 'text' as const,
                            text: JSON.stringify({ success: false, error: msg }),
                        },
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

    // Shared context handed to each extracted domain tool module.
    const ctx: ToolContext = {
        projectRoot,
        workspaceManager,
        projectIdSchema,
        getTaskMgr,
        getConfigMgr,
        getSkillsMgr,
    };

    registerV7Tools(server, ctx);

    // Release the PID lock on shutdown so a restart can re-acquire it.
    const releaseLock = () => releasePidLock(pidFilePath);
    process.on('SIGINT', () => {
        releaseLock();
        process.exit(0);
    });
    process.on('SIGTERM', () => {
        releaseLock();
        process.exit(0);
    });
    process.on('exit', releaseLock);

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
