/**
 * WorkspaceManager — Orchestrates multi-project workspace.
 *
 * Manages ProjectWorker lifecycle (spawn on-demand, kill idle),
 * discovers workspace config from multiple sources, and provides
 * cross-project operations (memory search, task listing).
 */

import { basename, dirname, isAbsolute, join, resolve } from 'path';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { ProjectWorker } from './project-worker.js';
import type { WorkspaceConfig, WorkspaceProject, WorkspaceStatus } from './workspace-types.js';

const DEFAULT_IDLE_TIMEOUT_MS = 300_000; // 5 minutes
const IDLE_CHECK_INTERVAL_MS = 60_000; // 1 minute

export class WorkspaceManager {
  private workers = new Map<string, ProjectWorker>();
  private config: WorkspaceConfig;
  private workspaceRoot: string;
  private idleCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: WorkspaceConfig, workspaceRoot: string) {
    this.config = config;
    this.workspaceRoot = workspaceRoot;
  }

  /** Start the idle-check timer. */
  startIdleChecker(): void {
    if (this.idleCheckInterval) return;
    this.idleCheckInterval = setInterval(
      () => this.killIdleWorkers(),
      IDLE_CHECK_INTERVAL_MS
    );
    // Don't keep process alive just for the idle checker
    this.idleCheckInterval.unref();
  }

  /** Stop the idle-check timer. */
  stopIdleChecker(): void {
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }
  }

  // --- Worker Lifecycle ---

  /**
   * Get (or spawn) a worker for the given project.
   * Initializes lazily on first access.
   */
  async getWorker(projectId: string): Promise<ProjectWorker> {
    const existing = this.workers.get(projectId);
    if (existing) {
      existing.touch();
      return existing;
    }
    return this.spawnWorker(projectId);
  }

  /** Spawn and initialize a new worker for the given project. */
  async spawnWorker(projectId: string): Promise<ProjectWorker> {
    const project = this.config.projects.find(
      (p) => p.name === projectId && p.enabled !== false
    );
    if (!project) {
      throw new Error(`Project "${projectId}" not found in workspace "${this.config.name}"`);
    }

    const projectRoot = isAbsolute(project.path)
      ? project.path
      : resolve(this.workspaceRoot, project.path);

    const worker = new ProjectWorker(projectId, projectRoot);
    await worker.initialize();
    this.workers.set(projectId, worker);
    return worker;
  }

  /** Shut down workers that have been idle longer than the configured timeout. */
  async killIdleWorkers(): Promise<string[]> {
    const timeout = this.config.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
    const killed: string[] = [];

    for (const [id, worker] of this.workers) {
      if (worker.isIdle(timeout)) {
        await worker.shutdown();
        this.workers.delete(id);
        killed.push(id);
      }
    }
    return killed;
  }

  /** Gracefully shut down all workers and stop the idle checker. */
  async shutdownAll(): Promise<void> {
    this.stopIdleChecker();
    for (const [id, worker] of this.workers) {
      await worker.shutdown();
      this.workers.delete(id);
    }
  }

  // --- Accessors ---

  getConfig(): WorkspaceConfig {
    return this.config;
  }

  getProjects(): WorkspaceProject[] {
    return this.config.projects.filter((p) => p.enabled !== false);
  }

  getDefaultProjectId(): string {
    return this.config.defaultProject ?? this.config.projects[0]?.name ?? '';
  }

  getActiveWorkerIds(): string[] {
    return [...this.workers.keys()];
  }

  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  /** Build a status snapshot of the entire workspace. */
  async getStatus(): Promise<WorkspaceStatus> {
    const projects = await Promise.all(
      this.getProjects().map(async (p) => {
        const worker = this.workers.get(p.name);
        const projectRoot = isAbsolute(p.path)
          ? p.path
          : resolve(this.workspaceRoot, p.path);
        const hasConfig = existsSync(join(projectRoot, '.rulebook'));

        let taskCount = 0;
        if (worker?.initialized) {
          try {
            const tasks = await worker.getTaskManager().listTasks(false);
            taskCount = tasks.length;
          } catch {
            // ignore
          }
        }

        return {
          name: p.name,
          path: projectRoot,
          workerActive: worker?.initialized ?? false,
          hasRulebookConfig: hasConfig,
          memoryEnabled: worker?.getRulebookConfig()?.memory?.enabled ?? false,
          taskCount,
          lastAccessed: worker?.lastAccessedAt,
        };
      })
    );

    return {
      name: this.config.name,
      projects,
      activeWorkers: this.workers.size,
      totalProjects: this.config.projects.length,
    };
  }

  // --- Cross-Project Operations ---

  /**
   * Search memory across all active workers.
   * Returns results tagged with project name.
   */
  async searchMemoryAcrossProjects(
    query: string,
    options?: { limit?: number; type?: string }
  ): Promise<Array<{ project: string; results: unknown[] }>> {
    const results: Array<{ project: string; results: unknown[] }> = [];

    for (const project of this.getProjects()) {
      try {
        const worker = await this.getWorker(project.name);
        const mm = worker.getMemoryManager();
        if (!mm) continue;

        const searchResults = await mm.searchMemories({
          query,
          limit: options?.limit ?? 10,
        });
        if (searchResults.length > 0) {
          results.push({ project: project.name, results: searchResults });
        }
      } catch {
        // Skip projects that fail to initialize
      }
    }
    return results;
  }

  // --- Static Discovery ---

  /**
   * Discovery chain (priority order):
   * 1. .rulebook-workspace.json
   * 2. *.code-workspace (VSCode format)
   * 3. Monorepo detection (pnpm/turbo/nx/lerna)
   * Returns null if no workspace found.
   */
  static findWorkspaceConfig(startDir: string): WorkspaceConfig | null {
    const dir = resolve(startDir);

    // 1. Native rulebook workspace
    const nativePath = join(dir, '.rulebook-workspace.json');
    if (existsSync(nativePath)) {
      try {
        return JSON.parse(readFileSync(nativePath, 'utf-8'));
      } catch {
        // fall through
      }
    }

    // 2. VSCode .code-workspace
    const codeWorkspace = WorkspaceManager.findCodeWorkspaceFile(dir);
    if (codeWorkspace) {
      return WorkspaceManager.fromCodeWorkspace(codeWorkspace, dir);
    }

    // 3. Monorepo detection
    return WorkspaceManager.fromMonorepo(dir);
  }

  /** Find a *.code-workspace file in the given directory. */
  private static findCodeWorkspaceFile(dir: string): string | null {
    try {
      const entries = readdirSync(dir);
      const match = entries.find((e) => e.endsWith('.code-workspace'));
      return match ? join(dir, match) : null;
    } catch {
      return null;
    }
  }

  /**
   * Parse a VSCode .code-workspace file into WorkspaceConfig.
   * Format: { "folders": [{ "path": "." }, { "path": "../frontend" }] }
   */
  static fromCodeWorkspace(filePath: string, workspaceRoot?: string): WorkspaceConfig | null {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as { folders?: Array<{ path: string; name?: string }> };
      if (!parsed.folders || parsed.folders.length === 0) return null;

      const root = workspaceRoot ?? dirname(filePath);
      const projects: WorkspaceProject[] = parsed.folders.map((folder) => {
        const resolvedPath = isAbsolute(folder.path)
          ? folder.path
          : resolve(root, folder.path);
        const name = folder.name ?? basename(resolvedPath);
        return { name, path: folder.path };
      });

      return {
        name: basename(filePath, '.code-workspace'),
        version: '1.0.0',
        projects,
        defaultProject: projects[0]?.name,
      };
    } catch {
      return null;
    }
  }

  /**
   * Detect monorepo structure and build WorkspaceConfig.
   * Checks: pnpm-workspace.yaml, turbo.json, nx.json, lerna.json
   */
  static fromMonorepo(dir: string): WorkspaceConfig | null {
    // Check for pnpm-workspace.yaml with packages
    const pnpmWs = join(dir, 'pnpm-workspace.yaml');
    if (existsSync(pnpmWs)) {
      return WorkspaceManager.buildMonorepoConfig(dir, 'pnpm');
    }

    // Check for turbo.json
    if (existsSync(join(dir, 'turbo.json'))) {
      return WorkspaceManager.buildMonorepoConfig(dir, 'turborepo');
    }

    // Check for nx.json
    if (existsSync(join(dir, 'nx.json'))) {
      return WorkspaceManager.buildMonorepoConfig(dir, 'nx');
    }

    // Check for lerna.json
    if (existsSync(join(dir, 'lerna.json'))) {
      return WorkspaceManager.buildMonorepoConfig(dir, 'lerna');
    }

    return null;
  }

  /** Build config from monorepo by scanning packages/ and apps/ directories. */
  private static buildMonorepoConfig(
    dir: string,
    _tool: string
  ): WorkspaceConfig | null {
    const projects: WorkspaceProject[] = [];

    // Scan common monorepo directories
    for (const subdir of ['packages', 'apps', 'libs', 'services']) {
      const fullPath = join(dir, subdir);
      if (!existsSync(fullPath)) continue;

      try {
        const entries = readdirSync(fullPath);
        for (const entry of entries) {
          const entryPath = join(fullPath, entry);
          if (!statSync(entryPath).isDirectory()) continue;

          // Only include directories that have a package.json or .rulebook
          if (
            existsSync(join(entryPath, 'package.json')) ||
            existsSync(join(entryPath, '.rulebook'))
          ) {
            projects.push({
              name: entry,
              path: `./${subdir}/${entry}`,
            });
          }
        }
      } catch {
        // ignore read errors
      }
    }

    if (projects.length === 0) return null;

    return {
      name: basename(dir),
      version: '1.0.0',
      projects,
      defaultProject: projects[0]?.name,
    };
  }

  /**
   * Walk up from `startDir` to find a workspace root directory.
   * Returns `{ config, root }` or null if no workspace found.
   */
  static findWorkspaceFromCwd(
    startDir: string
  ): { config: WorkspaceConfig; root: string } | null {
    let dir = resolve(startDir);
    const root = resolve('/');

    while (true) {
      const config = WorkspaceManager.findWorkspaceConfig(dir);
      if (config) {
        return { config, root: dir };
      }
      const parent = dirname(dir);
      if (parent === dir || parent === root) break;
      dir = parent;
    }
    return null;
  }

  /**
   * Given a cwd, find the workspace and determine which project the cwd belongs to.
   * Matches by checking if the cwd starts with the resolved project path.
   * Returns `{ config, root, projectName }` or null.
   */
  static resolveProjectFromCwd(
    cwd: string
  ): { config: WorkspaceConfig; root: string; projectName: string } | null {
    const ws = WorkspaceManager.findWorkspaceFromCwd(cwd);
    if (!ws) return null;

    const resolved = resolve(cwd);

    // Find the project whose resolved path is a prefix of cwd
    for (const project of ws.config.projects) {
      const projectRoot = isAbsolute(project.path)
        ? resolve(project.path)
        : resolve(ws.root, project.path);

      if (resolved === projectRoot || resolved.startsWith(projectRoot + '/')) {
        return { config: ws.config, root: ws.root, projectName: project.name };
      }
    }

    // cwd is at the workspace root itself — use defaultProject if set
    if (resolved === resolve(ws.root) && ws.config.defaultProject) {
      return { config: ws.config, root: ws.root, projectName: ws.config.defaultProject };
    }

    return null;
  }
}
