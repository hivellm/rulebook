// 'zod/v3', not 'zod': the MCP SDK types import 'zod/v3'; under moduleResolution
// "node" bare 'zod' loads a separate .d.cts copy of the same types and tsc
// runs out of memory comparing the two (TS2589). Keep all MCP zod imports on 'zod/v3'.
import type { z } from 'zod/v3';
import type { TaskBackend } from '../../core/tasks/task-backend.js';
import type { ConfigManager } from '../../core/state/config-manager.js';
import type { SkillsManager } from '../../core/skills/skills-manager.js';
import type { WorkspaceManager } from '../../core/workspace/workspace-manager.js';

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
    getTaskMgr: (projectId?: string) => Promise<TaskBackend>;
    getConfigMgr: (projectId?: string) => Promise<ConfigManager>;
    getSkillsMgr: (projectId?: string) => Promise<SkillsManager>;
}
