/**
 * Workspace Type Definitions
 *
 * Types for multi-project workspace management.
 * Supports monorepo, .code-workspace, and independent project layouts.
 */

export interface WorkspaceConfig {
  name: string;
  version: string;
  projects: WorkspaceProject[];
  defaultProject?: string;
  idleTimeoutMs?: number; // default: 300000 (5min)
  memory?: {
    crossProjectSearch?: boolean; // default: true
  };
}

export interface WorkspaceProject {
  name: string; // unique identifier (e.g., "frontend")
  path: string; // absolute or relative to workspace root
  enabled?: boolean; // default: true
}

export interface WorkspaceStatus {
  name: string;
  projects: WorkspaceProjectStatus[];
  activeWorkers: number;
  totalProjects: number;
}

export interface WorkspaceProjectStatus {
  name: string;
  path: string;
  workerActive: boolean;
  hasRulebookConfig: boolean;
  memoryEnabled: boolean;
  taskCount: number;
  lastAccessed?: number;
}
