import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectWorker } from '../src/core/workspace/project-worker.js';

// Default config used across tests
const DEFAULT_CONFIG = {
  version: '1.0.0',
  installedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  projectId: 'test-project',
  mode: 'full' as const,
  features: {
    watcher: true,
    agent: true,
    logging: true,
    telemetry: true,
    notifications: false,
    dryRun: false,
    gitHooks: true,
    repl: false,
    templates: true,
    context: false,
    health: true,
    plugins: false,
    parallel: false,
    smartContinue: false,
  },
  coverageThreshold: 95,
  language: 'en' as const,
  outputLanguage: 'en' as const,
  cliTools: [],
  maxParallelTasks: 1,
  timeouts: { taskExecution: 30000, cliResponse: 10000, testRun: 60000 },
};

// Mock all dependencies using regular functions (not arrows) so they work with `new`
vi.mock('../src/core/task-manager.js', () => ({
  TaskManager: vi.fn().mockImplementation(function (this: any) {
    this.list = vi.fn();
  }),
}));

vi.mock('../src/core/config-manager.js', () => ({
  ConfigManager: vi.fn().mockImplementation(function (this: any) {
    this.loadConfig = vi.fn().mockResolvedValue({ ...DEFAULT_CONFIG });
  }),
}));

vi.mock('../src/core/skills-manager.js', () => ({
  SkillsManager: vi.fn().mockImplementation(function (this: any) {
    this.loadSkills = vi.fn();
  }),
  getDefaultTemplatesPath: vi.fn().mockReturnValue('/mock/templates'),
}));

vi.mock('../src/memory/memory-manager.js', () => ({
  createMemoryManager: vi.fn().mockReturnValue({
    close: vi.fn().mockResolvedValue(undefined),
    save: vi.fn(),
  }),
}));

describe('ProjectWorker', () => {
  let worker: ProjectWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    worker = new ProjectWorker('frontend', '/projects/frontend');
  });

  describe('constructor', () => {
    it('should set projectId and projectRoot', () => {
      expect(worker.projectId).toBe('frontend');
      expect(worker.projectRoot).toBe('/projects/frontend');
    });

    it('should not be initialized after construction', () => {
      expect(worker.initialized).toBe(false);
    });

    it('should have a lastAccessedAt timestamp', () => {
      expect(worker.lastAccessedAt).toBeLessThanOrEqual(Date.now());
      expect(worker.lastAccessedAt).toBeGreaterThan(0);
    });
  });

  describe('initialize()', () => {
    it('should create all managers', async () => {
      const { TaskManager } = await import('../src/core/task-manager.js');
      const { ConfigManager } = await import('../src/core/config-manager.js');
      const { SkillsManager } = await import('../src/core/skills-manager.js');

      await worker.initialize();

      expect(worker.initialized).toBe(true);
      expect(TaskManager).toHaveBeenCalledWith('/projects/frontend', '.rulebook');
      expect(ConfigManager).toHaveBeenCalledWith('/projects/frontend');
      expect(SkillsManager).toHaveBeenCalledWith('/mock/templates', '/projects/frontend');
    });

    it('should be idempotent on double-initialize', async () => {
      const { ConfigManager } = await import('../src/core/config-manager.js');

      await worker.initialize();
      await worker.initialize();

      // ConfigManager constructor should only be called once
      expect(ConfigManager).toHaveBeenCalledTimes(1);
    });

    it('should load rulebook config', async () => {
      await worker.initialize();

      const config = worker.getRulebookConfig();
      expect(config).not.toBeNull();
      expect(config?.version).toBe('1.0.0');
      expect(config?.projectId).toBe('test-project');
    });

    it('should not initialize memory when disabled', async () => {
      const { createMemoryManager } = await import('../src/memory/memory-manager.js');

      await worker.initialize();

      // Default mock config has no memory.enabled
      expect(createMemoryManager).not.toHaveBeenCalled();
      expect(worker.getMemoryManager()).toBeNull();
    });

    it('should initialize memory when enabled', async () => {
      const { ConfigManager } = await import('../src/core/config-manager.js');
      const { createMemoryManager } = await import('../src/memory/memory-manager.js');

      vi.mocked(ConfigManager).mockImplementationOnce(function (this: any) {
        this.loadConfig = vi.fn().mockResolvedValue({
          ...DEFAULT_CONFIG,
          memory: { enabled: true },
        });
      } as any);

      const memWorker = new ProjectWorker('mem-project', '/projects/mem');
      await memWorker.initialize();

      expect(createMemoryManager).toHaveBeenCalledWith('/projects/mem', { enabled: true });
      expect(memWorker.getMemoryManager()).not.toBeNull();
    });

    it('should handle memory initialization failure gracefully', async () => {
      const { ConfigManager } = await import('../src/core/config-manager.js');
      const { createMemoryManager } = await import('../src/memory/memory-manager.js');

      vi.mocked(ConfigManager).mockImplementationOnce(function (this: any) {
        this.loadConfig = vi.fn().mockResolvedValue({
          ...DEFAULT_CONFIG,
          memory: { enabled: true },
        });
      } as any);

      vi.mocked(createMemoryManager).mockImplementationOnce(() => {
        throw new Error('WASM not available');
      });

      const failWorker = new ProjectWorker('fail-mem', '/projects/fail');
      await failWorker.initialize();

      expect(failWorker.initialized).toBe(true);
      expect(failWorker.getMemoryManager()).toBeNull();
    });
  });

  describe('touch()', () => {
    it('should update lastAccessedAt', async () => {
      const before = worker.lastAccessedAt;
      // Small delay to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 10));
      worker.touch();
      expect(worker.lastAccessedAt).toBeGreaterThan(before);
    });
  });

  describe('isIdle()', () => {
    it('should return false when recently accessed', () => {
      worker.touch();
      expect(worker.isIdle(300000)).toBe(false);
    });

    it('should return true when idle longer than timeout', () => {
      // Manually set lastAccessedAt to the past via touch + time manipulation
      const realDateNow = Date.now;
      const baseTime = realDateNow();

      // Set lastAccessedAt to 10 minutes ago
      Date.now = () => baseTime - 600000;
      worker.touch();

      // Restore current time
      Date.now = realDateNow;

      expect(worker.isIdle(300000)).toBe(true); // 5min timeout, 10min idle
    });

    it('should return false when idle shorter than timeout', () => {
      worker.touch();
      expect(worker.isIdle(999999999)).toBe(false);
    });
  });

  describe('getters throw when not initialized', () => {
    it('getTaskManager() should throw', () => {
      expect(() => worker.getTaskManager()).toThrow('Worker frontend not initialized');
    });

    it('getSkillsManager() should throw', () => {
      expect(() => worker.getSkillsManager()).toThrow('Worker frontend not initialized');
    });

    it('getConfigManager() should throw', () => {
      expect(() => worker.getConfigManager()).toThrow('Worker frontend not initialized');
    });

    it('getMemoryManager() should return null when not initialized', () => {
      expect(worker.getMemoryManager()).toBeNull();
    });

    it('getRulebookConfig() should return null when not initialized', () => {
      expect(worker.getRulebookConfig()).toBeNull();
    });
  });

  describe('getters after initialization', () => {
    beforeEach(async () => {
      await worker.initialize();
    });

    it('getTaskManager() should return a TaskManager', () => {
      const tm = worker.getTaskManager();
      expect(tm).toBeDefined();
    });

    it('getSkillsManager() should return a SkillsManager', () => {
      const sm = worker.getSkillsManager();
      expect(sm).toBeDefined();
    });

    it('getConfigManager() should return a ConfigManager', () => {
      const cm = worker.getConfigManager();
      expect(cm).toBeDefined();
    });

    it('getters should update lastAccessedAt', async () => {
      const before = worker.lastAccessedAt;
      await new Promise((r) => setTimeout(r, 10));
      worker.getTaskManager();
      expect(worker.lastAccessedAt).toBeGreaterThan(before);
    });
  });

  describe('shutdown()', () => {
    it('should set initialized to false', async () => {
      await worker.initialize();
      expect(worker.initialized).toBe(true);

      await worker.shutdown();
      expect(worker.initialized).toBe(false);
    });

    it('should close memory manager if present', async () => {
      const { ConfigManager } = await import('../src/core/config-manager.js');
      const { createMemoryManager } = await import('../src/memory/memory-manager.js');

      const mockClose = vi.fn().mockResolvedValue(undefined);
      vi.mocked(createMemoryManager).mockReturnValueOnce({
        close: mockClose,
        save: vi.fn(),
      } as any);

      vi.mocked(ConfigManager).mockImplementationOnce(function (this: any) {
        this.loadConfig = vi.fn().mockResolvedValue({
          ...DEFAULT_CONFIG,
          memory: { enabled: true },
        });
      } as any);

      const memWorker = new ProjectWorker('mem-shutdown', '/projects/mem');
      await memWorker.initialize();
      await memWorker.shutdown();

      expect(mockClose).toHaveBeenCalled();
    });

    it('should be safe to call shutdown without initialization', async () => {
      // Should not throw
      await worker.shutdown();
      expect(worker.initialized).toBe(false);
    });

    it('should stop bgIndexer if present', async () => {
      await worker.initialize();

      // Inject a mock bgIndexer via private field
      const mockStop = vi.fn();
      (worker as any).bgIndexer = { stop: mockStop };

      await worker.shutdown();

      expect(mockStop).toHaveBeenCalled();
      expect((worker as any).bgIndexer).toBeNull();
    });
  });
});
