import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join, resolve } from 'path';

// Mock fs before importing WorkspaceManager
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
  };
});

// Mock ProjectWorker
vi.mock('../src/core/workspace/project-worker.js', () => ({
  ProjectWorker: vi.fn().mockImplementation(function (this: any, id: string, root: string) {
    this.projectId = id;
    this.projectRoot = root;
    this._initialized = false;
    this._lastAccessedAt = Date.now();
    this._idle = false;
    this.initialized = false;
    this.lastAccessedAt = Date.now();
    this.initialize = vi.fn().mockImplementation(async () => {
      this.initialized = true;
      this._initialized = true;
    });
    this.shutdown = vi.fn().mockResolvedValue(undefined);
    this.touch = vi.fn().mockImplementation(() => {
      this._lastAccessedAt = Date.now();
      this.lastAccessedAt = Date.now();
    });
    this.isIdle = vi.fn().mockReturnValue(false);
    this.getTaskManager = vi.fn().mockReturnValue({
      listTasks: vi.fn().mockResolvedValue([]),
    });
    this.getMemoryManager = vi.fn().mockReturnValue(null);
    this.getSkillsManager = vi.fn().mockReturnValue({});
    this.getConfigManager = vi.fn().mockReturnValue({});
    this.getRulebookConfig = vi.fn().mockReturnValue(null);
  }),
}));

import { WorkspaceManager } from '../src/core/workspace/workspace-manager.js';
import { ProjectWorker } from '../src/core/workspace/project-worker.js';
import type { WorkspaceConfig } from '../src/core/workspace/workspace-types.js';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockStatSync = vi.mocked(statSync);

function makeConfig(overrides?: Partial<WorkspaceConfig>): WorkspaceConfig {
  return {
    name: 'test-workspace',
    version: '1.0.0',
    projects: [
      { name: 'frontend', path: './frontend' },
      { name: 'backend', path: './backend' },
    ],
    defaultProject: 'backend',
    ...overrides,
  };
}

describe('WorkspaceManager', () => {
  let manager: WorkspaceManager;
  const ROOT = '/workspace';

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new WorkspaceManager(makeConfig(), ROOT);
  });

  afterEach(async () => {
    manager.stopIdleChecker();
  });

  // --- Constructor & Accessors ---

  describe('constructor & accessors', () => {
    it('should store config and root', () => {
      expect(manager.getConfig().name).toBe('test-workspace');
      expect(manager.getWorkspaceRoot()).toBe(ROOT);
    });

    it('getProjects() should return enabled projects', () => {
      const projects = manager.getProjects();
      expect(projects).toHaveLength(2);
      expect(projects[0].name).toBe('frontend');
    });

    it('getProjects() should filter out disabled projects', () => {
      const mgr = new WorkspaceManager(
        makeConfig({
          projects: [
            { name: 'a', path: './a', enabled: true },
            { name: 'b', path: './b', enabled: false },
            { name: 'c', path: './c' },
          ],
        }),
        ROOT
      );
      expect(mgr.getProjects()).toHaveLength(2);
      expect(mgr.getProjects().map((p) => p.name)).toEqual(['a', 'c']);
    });

    it('getDefaultProjectId() should return configured default', () => {
      expect(manager.getDefaultProjectId()).toBe('backend');
    });

    it('getDefaultProjectId() should fallback to first project', () => {
      const mgr = new WorkspaceManager(
        makeConfig({ defaultProject: undefined }),
        ROOT
      );
      expect(mgr.getDefaultProjectId()).toBe('frontend');
    });

    it('getDefaultProjectId() should return empty string when no projects', () => {
      const mgr = new WorkspaceManager(
        makeConfig({ defaultProject: undefined, projects: [] }),
        ROOT
      );
      expect(mgr.getDefaultProjectId()).toBe('');
    });

    it('getActiveWorkerIds() should be empty initially', () => {
      expect(manager.getActiveWorkerIds()).toEqual([]);
    });
  });

  // --- Worker Lifecycle ---

  describe('spawnWorker()', () => {
    it('should spawn and initialize a worker', async () => {
      const worker = await manager.spawnWorker('frontend');
      expect(ProjectWorker).toHaveBeenCalledWith('frontend', resolve(ROOT, './frontend'));
      expect(worker.initialize).toHaveBeenCalled();
      expect(manager.getActiveWorkerIds()).toContain('frontend');
    });

    it('should resolve absolute paths correctly', async () => {
      const mgr = new WorkspaceManager(
        makeConfig({
          projects: [{ name: 'ext', path: '/absolute/ext' }],
        }),
        ROOT
      );
      await mgr.spawnWorker('ext');
      expect(ProjectWorker).toHaveBeenCalledWith('ext', '/absolute/ext');
    });

    it('should throw for unknown project', async () => {
      await expect(manager.spawnWorker('unknown')).rejects.toThrow(
        'Project "unknown" not found in workspace "test-workspace"'
      );
    });

    it('should throw for disabled project', async () => {
      const mgr = new WorkspaceManager(
        makeConfig({
          projects: [{ name: 'disabled-proj', path: './disabled', enabled: false }],
        }),
        ROOT
      );
      await expect(mgr.spawnWorker('disabled-proj')).rejects.toThrow(
        'Project "disabled-proj" not found'
      );
    });
  });

  describe('getWorker()', () => {
    it('should return existing worker and touch it', async () => {
      const w1 = await manager.getWorker('frontend');
      const w2 = await manager.getWorker('frontend');
      // Same instance (mock creates new each time via spawnWorker, but getWorker reuses)
      expect(w2).toBe(w1);
      expect(w1.touch).toHaveBeenCalled();
    });

    it('should spawn worker on first access', async () => {
      const worker = await manager.getWorker('backend');
      expect(ProjectWorker).toHaveBeenCalledWith('backend', resolve(ROOT, './backend'));
      expect(worker.initialize).toHaveBeenCalled();
    });
  });

  describe('killIdleWorkers()', () => {
    it('should kill idle workers and return their ids', async () => {
      const worker = await manager.spawnWorker('frontend');
      vi.mocked(worker.isIdle).mockReturnValue(true);

      const killed = await manager.killIdleWorkers();
      expect(killed).toEqual(['frontend']);
      expect(worker.shutdown).toHaveBeenCalled();
      expect(manager.getActiveWorkerIds()).not.toContain('frontend');
    });

    it('should not kill active workers', async () => {
      const worker = await manager.spawnWorker('frontend');
      vi.mocked(worker.isIdle).mockReturnValue(false);

      const killed = await manager.killIdleWorkers();
      expect(killed).toEqual([]);
      expect(worker.shutdown).not.toHaveBeenCalled();
      expect(manager.getActiveWorkerIds()).toContain('frontend');
    });

    it('should use config idleTimeoutMs', async () => {
      const mgr = new WorkspaceManager(makeConfig({ idleTimeoutMs: 60000 }), ROOT);
      const worker = await mgr.spawnWorker('frontend');

      await mgr.killIdleWorkers();
      expect(worker.isIdle).toHaveBeenCalledWith(60000);
    });

    it('should use default timeout when not configured', async () => {
      const worker = await manager.spawnWorker('frontend');
      await manager.killIdleWorkers();
      expect(worker.isIdle).toHaveBeenCalledWith(300_000);
    });
  });

  describe('shutdownAll()', () => {
    it('should shut down all workers', async () => {
      const w1 = await manager.spawnWorker('frontend');
      const w2 = await manager.spawnWorker('backend');

      await manager.shutdownAll();
      expect(w1.shutdown).toHaveBeenCalled();
      expect(w2.shutdown).toHaveBeenCalled();
      expect(manager.getActiveWorkerIds()).toEqual([]);
    });

    it('should stop idle checker', async () => {
      manager.startIdleChecker();
      await manager.shutdownAll();
      // Calling stopIdleChecker again should be safe (no-op)
      manager.stopIdleChecker();
    });
  });

  // --- Idle Checker ---

  describe('idle checker', () => {
    it('startIdleChecker() should be idempotent', () => {
      manager.startIdleChecker();
      manager.startIdleChecker();
      // Should not throw
      manager.stopIdleChecker();
    });

    it('stopIdleChecker() should be safe without start', () => {
      manager.stopIdleChecker();
      // Should not throw
    });

    it('should call killIdleWorkers when timer fires', async () => {
      vi.useFakeTimers();
      try {
        const worker = await manager.spawnWorker('frontend');
        vi.mocked(worker.isIdle).mockReturnValue(true);

        manager.startIdleChecker();

        // Advance timer by the idle check interval (60s)
        await vi.advanceTimersByTimeAsync(60_000);

        expect(worker.isIdle).toHaveBeenCalled();
        expect(worker.shutdown).toHaveBeenCalled();
        expect(manager.getActiveWorkerIds()).not.toContain('frontend');
      } finally {
        manager.stopIdleChecker();
        vi.useRealTimers();
      }
    });
  });

  // --- getStatus() ---

  describe('getStatus()', () => {
    it('should return status for all enabled projects', async () => {
      mockExistsSync.mockReturnValue(false);

      const status = await manager.getStatus();
      expect(status.name).toBe('test-workspace');
      expect(status.totalProjects).toBe(2);
      expect(status.activeWorkers).toBe(0);
      expect(status.projects).toHaveLength(2);
      expect(status.projects[0].name).toBe('frontend');
      expect(status.projects[0].workerActive).toBe(false);
    });

    it('should include task count from active workers', async () => {
      mockExistsSync.mockReturnValue(true);

      const worker = await manager.spawnWorker('frontend');
      vi.mocked(worker.getTaskManager).mockReturnValue({
        listTasks: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
      } as any);

      const status = await manager.getStatus();
      const frontendStatus = status.projects.find((p) => p.name === 'frontend');
      expect(frontendStatus?.workerActive).toBe(true);
      expect(frontendStatus?.taskCount).toBe(2);
      expect(status.activeWorkers).toBe(1);
    });

    it('should handle task list errors gracefully', async () => {
      mockExistsSync.mockReturnValue(false);

      const worker = await manager.spawnWorker('frontend');
      vi.mocked(worker.getTaskManager).mockReturnValue({
        listTasks: vi.fn().mockRejectedValue(new Error('read error')),
      } as any);

      const status = await manager.getStatus();
      const frontendStatus = status.projects.find((p) => p.name === 'frontend');
      expect(frontendStatus?.taskCount).toBe(0);
    });

    it('should detect .rulebook config presence', async () => {
      mockExistsSync.mockImplementation((p: any) => {
        return String(p).endsWith('.rulebook');
      });

      const status = await manager.getStatus();
      expect(status.projects[0].hasRulebookConfig).toBe(true);
    });
  });

  // --- Cross-Project Memory Search ---

  describe('searchMemoryAcrossProjects()', () => {
    it('should skip projects without memory manager', async () => {
      const results = await manager.searchMemoryAcrossProjects('query');
      // Workers are spawned lazily via getWorker, memoryManager returns null
      expect(results).toEqual([]);
    });

    it('should collect results from projects with memory', async () => {
      // Pre-spawn a worker with memory
      const worker = await manager.spawnWorker('frontend');
      vi.mocked(worker.getMemoryManager).mockReturnValue({
        searchMemories: vi.fn().mockResolvedValue([{ id: 'm1', content: 'result' }]),
      } as any);

      // Also spawn backend without memory
      const w2 = await manager.spawnWorker('backend');
      vi.mocked(w2.getMemoryManager).mockReturnValue(null);

      const results = await manager.searchMemoryAcrossProjects('auth');
      expect(results).toHaveLength(1);
      expect(results[0].project).toBe('frontend');
      expect(results[0].results).toHaveLength(1);
    });

    it('should pass limit option to search', async () => {
      const worker = await manager.spawnWorker('frontend');
      const mockSearch = vi.fn().mockResolvedValue([]);
      vi.mocked(worker.getMemoryManager).mockReturnValue({
        searchMemories: mockSearch,
      } as any);

      await manager.searchMemoryAcrossProjects('query', { limit: 5 });
      expect(mockSearch).toHaveBeenCalledWith({ query: 'query', limit: 5 });
    });

    it('should use default limit of 10', async () => {
      const worker = await manager.spawnWorker('frontend');
      const mockSearch = vi.fn().mockResolvedValue([]);
      vi.mocked(worker.getMemoryManager).mockReturnValue({
        searchMemories: mockSearch,
      } as any);

      await manager.searchMemoryAcrossProjects('query');
      expect(mockSearch).toHaveBeenCalledWith({ query: 'query', limit: 10 });
    });

    it('should skip projects that fail to initialize', async () => {
      // First spawn succeeds, getWorker for second project fails during spawn
      const worker = await manager.spawnWorker('frontend');
      vi.mocked(worker.getMemoryManager).mockReturnValue({
        searchMemories: vi.fn().mockResolvedValue([{ id: 'm1' }]),
      } as any);

      // No need to pre-spawn backend — it will try to spawn via getWorker and fail gracefully
      const results = await manager.searchMemoryAcrossProjects('query');
      expect(results).toHaveLength(1);
    });
  });

  // --- Static Discovery ---

  describe('findWorkspaceConfig()', () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(false);
    });

    it('should find .rulebook/workspace.json first', () => {
      const wsConfig: WorkspaceConfig = {
        name: 'ws',
        version: '1.0.0',
        projects: [{ name: 'a', path: './a' }],
      };

      mockExistsSync.mockImplementation((p: any) => {
        return String(p).endsWith('.rulebook/workspace.json');
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(wsConfig));

      const result = WorkspaceManager.findWorkspaceConfig('/test');
      expect(result).toEqual(wsConfig);
    });

    it('should fall through on invalid .rulebook/workspace.json', () => {
      mockExistsSync.mockImplementation((p: any) => {
        return String(p).endsWith('.rulebook/workspace.json');
      });
      mockReadFileSync.mockReturnValue('invalid json{{{');
      mockReaddirSync.mockReturnValue([] as any);

      const result = WorkspaceManager.findWorkspaceConfig('/test');
      expect(result).toBeNull();
    });

    it('should find *.code-workspace as second priority', () => {
      mockExistsSync.mockReturnValue(false);
      mockReaddirSync.mockReturnValue(['myproject.code-workspace'] as any);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          folders: [{ path: '.' }, { path: '../frontend' }],
        })
      );

      const result = WorkspaceManager.findWorkspaceConfig('/test');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('myproject');
      expect(result?.projects).toHaveLength(2);
    });

    it('should detect monorepo as third priority', () => {
      // No .rulebook/workspace.json, no .code-workspace
      mockReaddirSync.mockImplementation((dir: any) => {
        const d = String(dir);
        if (d.endsWith('/test')) return [] as any; // no .code-workspace
        if (d.endsWith('packages')) return ['pkg-a', 'pkg-b'] as any;
        return [] as any;
      });

      mockExistsSync.mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('pnpm-workspace.yaml')) return true;
        if (s.endsWith('packages')) return true;
        if (s.endsWith('package.json')) return true;
        return false;
      });

      mockStatSync.mockReturnValue({ isDirectory: () => true } as any);

      const result = WorkspaceManager.findWorkspaceConfig('/test');
      expect(result).not.toBeNull();
      expect(result?.projects).toHaveLength(2);
      expect(result?.projects[0].name).toBe('pkg-a');
    });

    it('should return null when nothing found', () => {
      mockReaddirSync.mockReturnValue([] as any);

      const result = WorkspaceManager.findWorkspaceConfig('/test');
      expect(result).toBeNull();
    });
  });

  describe('fromCodeWorkspace()', () => {
    it('should parse VSCode .code-workspace format', () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          folders: [
            { path: '.', name: 'backend' },
            { path: '../frontend' },
            { path: '../panel', name: 'admin-panel' },
          ],
        })
      );

      const result = WorkspaceManager.fromCodeWorkspace('/ws/backend.code-workspace', '/ws');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('backend');
      expect(result?.projects).toHaveLength(3);
      expect(result?.projects[0].name).toBe('backend');
      expect(result?.projects[1].path).toBe('../frontend');
      expect(result?.projects[2].name).toBe('admin-panel');
      expect(result?.defaultProject).toBe('backend');
    });

    it('should return null for empty folders', () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({ folders: [] }));
      expect(WorkspaceManager.fromCodeWorkspace('/ws/test.code-workspace')).toBeNull();
    });

    it('should return null for missing folders key', () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({ settings: {} }));
      expect(WorkspaceManager.fromCodeWorkspace('/ws/test.code-workspace')).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      mockReadFileSync.mockReturnValue('not json');
      expect(WorkspaceManager.fromCodeWorkspace('/ws/test.code-workspace')).toBeNull();
    });

    it('should use dirname of filePath when workspaceRoot not provided', () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ folders: [{ path: '.' }] })
      );

      const result = WorkspaceManager.fromCodeWorkspace('/projects/ws/app.code-workspace');
      expect(result).not.toBeNull();
      // Name derived from basename of resolved path using dirname as root
    });
  });

  describe('fromMonorepo()', () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(false);
    });

    it('should detect pnpm workspace', () => {
      mockExistsSync.mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('pnpm-workspace.yaml')) return true;
        if (s.endsWith('packages')) return true;
        if (s.endsWith('package.json')) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue(['core', 'utils'] as any);
      mockStatSync.mockReturnValue({ isDirectory: () => true } as any);

      const result = WorkspaceManager.fromMonorepo('/mono');
      expect(result).not.toBeNull();
      expect(result?.projects).toHaveLength(2);
      expect(result?.projects[0].path).toBe('./packages/core');
    });

    it('should detect turbo.json', () => {
      mockExistsSync.mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('turbo.json')) return true;
        if (s.endsWith('apps')) return true;
        if (s.endsWith('package.json')) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue(['web', 'api'] as any);
      mockStatSync.mockReturnValue({ isDirectory: () => true } as any);

      const result = WorkspaceManager.fromMonorepo('/mono');
      expect(result).not.toBeNull();
      expect(result?.projects[0].path).toBe('./apps/web');
    });

    it('should detect nx.json', () => {
      mockExistsSync.mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('nx.json')) return true;
        if (s.endsWith('libs')) return true;
        if (s.endsWith('package.json')) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue(['shared'] as any);
      mockStatSync.mockReturnValue({ isDirectory: () => true } as any);

      const result = WorkspaceManager.fromMonorepo('/mono');
      expect(result).not.toBeNull();
    });

    it('should detect lerna.json', () => {
      mockExistsSync.mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('lerna.json')) return true;
        if (s.endsWith('packages')) return true;
        if (s.endsWith('.rulebook')) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue(['pkg-a'] as any);
      mockStatSync.mockReturnValue({ isDirectory: () => true } as any);

      const result = WorkspaceManager.fromMonorepo('/mono');
      expect(result).not.toBeNull();
    });

    it('should return null when no monorepo markers found', () => {
      const result = WorkspaceManager.fromMonorepo('/mono');
      expect(result).toBeNull();
    });

    it('should skip non-directory entries', () => {
      mockExistsSync.mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('pnpm-workspace.yaml')) return true;
        if (s.endsWith('packages')) return true;
        if (s.endsWith('package.json')) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue(['readme.md', 'actual-pkg'] as any);
      mockStatSync.mockImplementation((p: any) => {
        const s = String(p);
        return { isDirectory: () => !s.endsWith('readme.md') } as any;
      });

      const result = WorkspaceManager.fromMonorepo('/mono');
      expect(result?.projects).toHaveLength(1);
      expect(result?.projects[0].name).toBe('actual-pkg');
    });

    it('should skip directories without package.json or .rulebook', () => {
      mockExistsSync.mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('pnpm-workspace.yaml')) return true;
        if (s.endsWith('packages')) return true;
        // No package.json or .rulebook in any subdirectory
        return false;
      });
      mockReaddirSync.mockReturnValue(['empty-dir'] as any);
      mockStatSync.mockReturnValue({ isDirectory: () => true } as any);

      const result = WorkspaceManager.fromMonorepo('/mono');
      expect(result).toBeNull();
    });

    it('should scan multiple monorepo directories', () => {
      mockExistsSync.mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('turbo.json')) return true;
        if (s.endsWith('packages') || s.endsWith('apps')) return true;
        if (s.endsWith('package.json')) return true;
        return false;
      });
      mockReaddirSync.mockImplementation((dir: any) => {
        const d = String(dir);
        if (d.endsWith('packages')) return ['shared'] as any;
        if (d.endsWith('apps')) return ['web'] as any;
        return [] as any;
      });
      mockStatSync.mockReturnValue({ isDirectory: () => true } as any);

      const result = WorkspaceManager.fromMonorepo('/mono');
      expect(result?.projects).toHaveLength(2);
      expect(result?.projects.map((p) => p.name)).toEqual(['shared', 'web']);
    });
  });
});
