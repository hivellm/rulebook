import type { RulebookTask, TaskValidationResult } from './task-manager.js';

/**
 * The task surface every backend must provide.
 *
 * `TaskManager` (files under `<rulebookDir>/tasks/`) is the default and the
 * historical implementation; `GitHubTaskBackend` stores the same task shape as
 * labelled GitHub issues. Callers — the MCP tools, the CLI, the update command
 * — talk to this interface so neither has to know which store is active.
 *
 * The method set is exactly what those callers already used on TaskManager, so
 * adding the interface changed no behaviour on the file side.
 */
export interface TaskBackend {
    initialize(): Promise<void>;
    validateTaskId(taskId: string): { valid: boolean; error?: string };
    extractPhase(taskId: string): { phase: number; subletter: string };

    createTask(taskId: string): Promise<void>;
    listTasks(includeArchived?: boolean): Promise<RulebookTask[]>;
    loadTask(taskId: string, archived?: boolean): Promise<RulebookTask | null>;
    showTask(taskId: string): Promise<RulebookTask | null>;
    validateTask(taskId: string): Promise<TaskValidationResult>;
    updateTaskStatus(taskId: string, status: RulebookTask['status']): Promise<void>;
    archiveTask(taskId: string, skipValidation?: boolean, tailWaiver?: string): Promise<void>;
    deleteTask(taskId: string): Promise<void>;
    getTaskMetadata(taskId: string): Promise<Record<string, unknown> | null>;
    updateReadme(): Promise<void>;
}

export type TaskBackendKind = 'files' | 'github';

export interface GitHubBackendOptions {
    /** owner/name. When omitted, `gh` infers it from the git remote. */
    repo?: string;
    /** Label marking rulebook-owned issues. */
    label?: string;
}

export const DEFAULT_TASK_LABEL = 'rulebook-task';

/** Status labels are namespaced so they cannot collide with a project's own. */
export const STATUS_LABEL_PREFIX = 'rulebook-status:';
