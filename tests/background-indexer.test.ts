import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Stats } from 'fs';

// Mock chokidar before importing BackgroundIndexer
const mockWatcher = {
  on: vi.fn().mockReturnThis(),
  close: vi.fn(),
};
vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => mockWatcher),
  },
}));

// Mock fs
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    statSync: vi.fn(() => ({ isFile: () => true })),
  };
});

import chokidar from 'chokidar';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { BackgroundIndexer } from '../src/core/indexer/background-indexer.js';

const mockMemoryManager = {
  deleteCodeNodesByFile: vi.fn(),
  saveCodeNode: vi.fn(),
  saveCodeEdge: vi.fn(),
} as any;

describe('BackgroundIndexer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWatcher.on.mockReturnThis();
  });

  describe('constructor defaults', () => {
    it('should default depth to 4', () => {
      const indexer = new BackgroundIndexer(mockMemoryManager, '/project');
      // Start to trigger chokidar.watch with the config
      indexer.start();
      const watchCall = vi.mocked(chokidar.watch).mock.calls[0];
      expect(watchCall[1]?.depth).toBe(4);
    });

    it('should default usePolling to false', () => {
      const indexer = new BackgroundIndexer(mockMemoryManager, '/project');
      indexer.start();
      const watchCall = vi.mocked(chokidar.watch).mock.calls[0];
      expect(watchCall[1]?.usePolling).toBe(false);
    });

    it('should accept custom depth', () => {
      const indexer = new BackgroundIndexer(mockMemoryManager, '/project', { depth: 2 });
      indexer.start();
      const watchCall = vi.mocked(chokidar.watch).mock.calls[0];
      expect(watchCall[1]?.depth).toBe(2);
    });

    it('should accept custom usePolling', () => {
      const indexer = new BackgroundIndexer(mockMemoryManager, '/project', { usePolling: true });
      indexer.start();
      const watchCall = vi.mocked(chokidar.watch).mock.calls[0];
      expect(watchCall[1]?.usePolling).toBe(true);
      // When usePolling is true, interval should be set
      expect(watchCall[1]?.interval).toBe(2000);
    });
  });

  describe('watchPaths resolution', () => {
    it('should resolve "." to project root', () => {
      const indexer = new BackgroundIndexer(mockMemoryManager, '/project', {
        watchPaths: ['.'],
      });
      indexer.start();
      const watchCall = vi.mocked(chokidar.watch).mock.calls[0];
      const targets = watchCall[0] as string[];
      expect(targets).toContain(resolve('/project'));
    });

    it('should resolve relative paths against project root', () => {
      const indexer = new BackgroundIndexer(mockMemoryManager, '/project', {
        watchPaths: ['src', 'lib'],
      });
      indexer.start();
      const watchCall = vi.mocked(chokidar.watch).mock.calls[0];
      const targets = watchCall[0] as string[];
      expect(targets).toContain(resolve('/project', 'src'));
      expect(targets).toContain(resolve('/project', 'lib'));
    });

    it('should filter out non-existent paths', () => {
      vi.mocked(existsSync).mockImplementation((p) => {
        return String(p).endsWith('src');
      });
      const indexer = new BackgroundIndexer(mockMemoryManager, '/project', {
        watchPaths: ['src', 'nonexistent'],
      });
      indexer.start();
      const watchCall = vi.mocked(chokidar.watch).mock.calls[0];
      const targets = watchCall[0] as string[];
      expect(targets).toHaveLength(1);
      expect(targets[0]).toContain('src');
    });

    it('should fall back to project root when no paths exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const indexer = new BackgroundIndexer(mockMemoryManager, '/project', {
        watchPaths: ['nonexistent'],
      });
      indexer.start();
      const watchCall = vi.mocked(chokidar.watch).mock.calls[0];
      const targets = watchCall[0] as string[];
      expect(targets).toContain(resolve('/project'));
    });
  });

  describe('ignored function', () => {
    function getIgnoredFn(): (path: string, stats?: Stats) => boolean {
      const indexer = new BackgroundIndexer(mockMemoryManager, '/project');
      indexer.start();
      const watchCall = vi.mocked(chokidar.watch).mock.calls[0];
      return watchCall[1]?.ignored as (path: string, stats?: Stats) => boolean;
    }

    it('should use a function-based ignored (not globs)', () => {
      const ignoredFn = getIgnoredFn();
      expect(typeof ignoredFn).toBe('function');
    });

    it('should block node_modules directories', () => {
      const ignoredFn = getIgnoredFn();
      const dirStats = { isDirectory: () => true } as Stats;
      expect(ignoredFn('/project/node_modules', dirStats)).toBe(true);
    });

    it('should block .git directories', () => {
      const ignoredFn = getIgnoredFn();
      const dirStats = { isDirectory: () => true } as Stats;
      expect(ignoredFn('/project/.git', dirStats)).toBe(true);
    });

    it('should block dist directories', () => {
      const ignoredFn = getIgnoredFn();
      const dirStats = { isDirectory: () => true } as Stats;
      expect(ignoredFn('/project/dist', dirStats)).toBe(true);
    });

    it('should block build directories', () => {
      const ignoredFn = getIgnoredFn();
      const dirStats = { isDirectory: () => true } as Stats;
      expect(ignoredFn('/project/build', dirStats)).toBe(true);
    });

    it('should block coverage directories', () => {
      const ignoredFn = getIgnoredFn();
      const dirStats = { isDirectory: () => true } as Stats;
      expect(ignoredFn('/project/coverage', dirStats)).toBe(true);
    });

    it('should not block regular source directories', () => {
      const ignoredFn = getIgnoredFn();
      const dirStats = { isDirectory: () => true } as Stats;
      expect(ignoredFn('/project/src', dirStats)).toBe(false);
    });

    it('should not block files with ignored dir names (e.g. a file named "dist")', () => {
      const ignoredFn = getIgnoredFn();
      const fileStats = { isDirectory: () => false } as Stats;
      expect(ignoredFn('/project/src/dist', fileStats)).toBe(false);
    });

    it('should block binary file extensions', () => {
      const ignoredFn = getIgnoredFn();
      expect(ignoredFn('/project/image.png')).toBe(true);
      expect(ignoredFn('/project/photo.jpg')).toBe(true);
      expect(ignoredFn('/project/data.sqlite')).toBe(true);
      expect(ignoredFn('/project/package-lock.lock')).toBe(true);
    });

    it('should allow source code files', () => {
      const ignoredFn = getIgnoredFn();
      expect(ignoredFn('/project/src/index.ts')).toBe(false);
      expect(ignoredFn('/project/src/app.js')).toBe(false);
    });

    it('should block ignored dirs even without stats (initial scan)', () => {
      const ignoredFn = getIgnoredFn();
      expect(ignoredFn('/project/node_modules')).toBe(true);
      expect(ignoredFn('/project/.git')).toBe(true);
    });

    it('should respect custom ignore patterns', () => {
      const indexer = new BackgroundIndexer(mockMemoryManager, '/project', {
        ignorePatterns: ['vendor', '__pycache__'],
      });
      indexer.start();
      const watchCall = vi.mocked(chokidar.watch).mock.calls[0];
      const ignoredFn = watchCall[1]?.ignored as (path: string, stats?: Stats) => boolean;
      const dirStats = { isDirectory: () => true } as Stats;
      expect(ignoredFn('/project/vendor', dirStats)).toBe(true);
      expect(ignoredFn('/project/__pycache__', dirStats)).toBe(true);
    });
  });

  describe('EMFILE recovery', () => {
    it('should retry with polling on EMFILE error', () => {
      const indexer = new BackgroundIndexer(mockMemoryManager, '/project');
      vi.mocked(existsSync).mockReturnValue(true);
      indexer.start();

      // Get the error handler
      const errorHandler = mockWatcher.on.mock.calls.find(
        (call: [string, (...args: any[]) => void]) => call[0] === 'error'
      )?.[1] as (error: unknown) => void;
      expect(errorHandler).toBeDefined();

      // Reset mock to track the retry call
      vi.mocked(chokidar.watch).mockClear();
      mockWatcher.on.mockReturnThis();

      // Simulate EMFILE error
      const emfileError = new Error('EMFILE: too many open files') as NodeJS.ErrnoException;
      emfileError.code = 'EMFILE';
      errorHandler(emfileError);

      // Should have restarted with polling
      expect(chokidar.watch).toHaveBeenCalledTimes(1);
      const retryCall = vi.mocked(chokidar.watch).mock.calls[0];
      expect(retryCall[1]?.usePolling).toBe(true);
    });

    it('should not retry more than once on repeated EMFILE', () => {
      const indexer = new BackgroundIndexer(mockMemoryManager, '/project');
      vi.mocked(existsSync).mockReturnValue(true);
      indexer.start();

      const errorHandler = mockWatcher.on.mock.calls.find(
        (call: [string, (...args: any[]) => void]) => call[0] === 'error'
      )?.[1] as (error: unknown) => void;

      vi.mocked(chokidar.watch).mockClear();
      mockWatcher.on.mockReturnThis();

      // First EMFILE: should retry
      const emfileError = new Error('EMFILE') as NodeJS.ErrnoException;
      emfileError.code = 'EMFILE';
      errorHandler(emfileError);
      expect(chokidar.watch).toHaveBeenCalledTimes(1);

      // Get new error handler from the retry
      const retryErrorHandler = mockWatcher.on.mock.calls.find(
        (call: [string, (...args: any[]) => void]) => call[0] === 'error'
      )?.[1] as (error: unknown) => void;

      vi.mocked(chokidar.watch).mockClear();

      // Second EMFILE: should NOT retry
      retryErrorHandler(emfileError);
      expect(chokidar.watch).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should not start watcher when disabled', () => {
      const indexer = new BackgroundIndexer(mockMemoryManager, '/project', { enabled: false });
      indexer.start();
      expect(chokidar.watch).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return initial status', () => {
      const indexer = new BackgroundIndexer(mockMemoryManager, '/project');
      const status = indexer.getStatus();
      expect(status).toEqual({
        queue: 0,
        processed: 0,
        errors: 0,
        isProcessing: false,
      });
    });
  });

  describe('stop', () => {
    it('should close watcher on stop', () => {
      const indexer = new BackgroundIndexer(mockMemoryManager, '/project');
      indexer.start();
      indexer.stop();
      expect(mockWatcher.close).toHaveBeenCalled();
    });
  });
});
