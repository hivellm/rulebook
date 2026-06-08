import type { z } from 'zod';
import type { TaskManager } from '../../core/tasks/task-manager.js';
import type { ConfigManager } from '../../core/state/config-manager.js';
import type { SkillsManager } from '../../core/skills/skills-manager.js';
import type { WorkspaceManager } from '../../core/workspace/workspace-manager.js';
import type { ProjectWorker } from '../../core/workspace/project-worker.js';

/**
 * Shared dependencies passed to each domain tool-registration module.
 *
 * The MCP server's tool handlers were extracted from one monolithic function
 * into per-domain modules (`src/mcp/tools/*`). Each module receives this
 * context and destructures only what it uses. The manager getters are
 * workspace-aware: with a `projectId` (workspace mode) they resolve the
 * per-project manager, otherwise they return the default single-project one.
 */
export interface ToolContext {
    projectRoot: string;
    workspaceManager: WorkspaceManager | null;
    projectIdSchema: z.ZodOptional<z.ZodString>;
    getTaskMgr: (projectId?: string) => Promise<TaskManager>;
    getConfigMgr: (projectId?: string) => Promise<ConfigManager>;
    getSkillsMgr: (projectId?: string) => Promise<SkillsManager>;
    getMemMgr: (projectId?: string) => Promise<ReturnType<ProjectWorker['getMemoryManager']>>;
    /** Fire-and-forget auto-capture of tool interactions to memory. Never throws. */
    autoCapture: (toolName: string, args: Record<string, unknown>, resultText: string) => void;
}
