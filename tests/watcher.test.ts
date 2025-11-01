import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startWatcher, startModernWatcher } from '../src/core/watcher.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock the modern console to avoid actual UI rendering
vi.mock('../src/core/modern-console.js', () => ({
  createModernConsole: vi.fn(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock the agent manager to avoid initialization issues
vi.mock('../src/core/agent-manager.js', () => ({
  AgentManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock console methods to avoid output during tests
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'clear').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Watcher', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory in system temp
    tempDir = join(tmpdir(), 'rulebook-test-watcher-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('startWatcher', () => {
    it('should create agent manager and modern console', async () => {
      const { AgentManager } = await import('../src/core/agent-manager.js');
      const { createModernConsole } = await import('../src/core/modern-console.js');

      await startWatcher(tempDir);

      expect(AgentManager).toHaveBeenCalledWith(tempDir);
      expect(createModernConsole).toHaveBeenCalledWith({
        projectRoot: tempDir,
        refreshInterval: 100,
        agentManager: expect.any(Object),
      });
    });

    it('should start the modern console', async () => {
      const { createModernConsole } = await import('../src/core/modern-console.js');
      const mockConsole = {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
      createModernConsole.mockReturnValue(mockConsole);

      await startWatcher(tempDir);

      expect(mockConsole.start).toHaveBeenCalled();
    });

    it('should handle errors during startup', async () => {
      const { createModernConsole } = await import('../src/core/modern-console.js');
      const mockConsole = {
        start: vi.fn().mockRejectedValue(new Error('Startup failed')),
        stop: vi.fn().mockResolvedValue(undefined),
      };
      createModernConsole.mockReturnValue(mockConsole);

      await expect(startWatcher(tempDir)).rejects.toThrow('Startup failed');
    });

    it('should use correct configuration', async () => {
      const { createModernConsole } = await import('../src/core/modern-console.js');

      await startWatcher(tempDir);

      expect(createModernConsole).toHaveBeenCalledWith({
        projectRoot: tempDir,
        refreshInterval: 100,
        agentManager: expect.any(Object),
      });
    });
  });

  describe('startModernWatcher', () => {
    it('should be an alias for startWatcher', async () => {
      const { AgentManager } = await import('../src/core/agent-manager.js');
      const { createModernConsole } = await import('../src/core/modern-console.js');

      await startModernWatcher(tempDir);

      expect(AgentManager).toHaveBeenCalledWith(tempDir);
      expect(createModernConsole).toHaveBeenCalledWith({
        projectRoot: tempDir,
        refreshInterval: 100,
        agentManager: expect.any(Object),
      });
    });

    it('should have identical behavior to startWatcher', async () => {
      const { createModernConsole } = await import('../src/core/modern-console.js');
      const mockConsole = {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
      createModernConsole.mockReturnValue(mockConsole);

      await startModernWatcher(tempDir);

      expect(mockConsole.start).toHaveBeenCalled();
    });

    it('should handle errors identically to startWatcher', async () => {
      const { createModernConsole } = await import('../src/core/modern-console.js');
      const mockConsole = {
        start: vi.fn().mockRejectedValue(new Error('Startup failed')),
        stop: vi.fn().mockResolvedValue(undefined),
      };
      createModernConsole.mockReturnValue(mockConsole);

      await expect(startModernWatcher(tempDir)).rejects.toThrow('Startup failed');
    });
  });

  describe('integration', () => {
    it('should create agent manager with correct project root', async () => {
      const { AgentManager } = await import('../src/core/agent-manager.js');

      await startWatcher(tempDir);

      expect(AgentManager).toHaveBeenCalledWith(tempDir);
    });

    it('should pass agent manager to modern console', async () => {
      const { AgentManager } = await import('../src/core/agent-manager.js');
      const { createModernConsole } = await import('../src/core/modern-console.js');

      await startWatcher(tempDir);

      const agentManagerInstance = AgentManager.mock.results[0].value;
      expect(createModernConsole).toHaveBeenCalledWith({
        projectRoot: tempDir,
        refreshInterval: 100,
        agentManager: agentManagerInstance,
      });
    });

    it('should use default refresh interval', async () => {
      const { createModernConsole } = await import('../src/core/modern-console.js');

      await startWatcher(tempDir);

      expect(createModernConsole).toHaveBeenCalledWith({
        projectRoot: tempDir,
        refreshInterval: 100,
        agentManager: expect.any(Object),
      });
    });
  });

  describe('error handling', () => {
    it('should propagate agent manager creation errors', async () => {
      const { AgentManager } = await import('../src/core/agent-manager.js');
      AgentManager.mockImplementation(() => {
        throw new Error('Agent manager creation failed');
      });

      await expect(startWatcher(tempDir)).rejects.toThrow('Agent manager creation failed');
    });

    it('should propagate modern console creation errors', async () => {
      const { createModernConsole } = await import('../src/core/modern-console.js');
      createModernConsole.mockImplementation(() => {
        throw new Error('Modern console creation failed');
      });

      await expect(startWatcher(tempDir)).rejects.toThrow('Modern console creation failed');
    });

    it('should handle both functions with same error handling', async () => {
      const { AgentManager } = await import('../src/core/agent-manager.js');
      AgentManager.mockImplementation(() => {
        throw new Error('Agent manager creation failed');
      });

      await expect(startWatcher(tempDir)).rejects.toThrow('Agent manager creation failed');
      await expect(startModernWatcher(tempDir)).rejects.toThrow('Agent manager creation failed');
    });
  });
});
