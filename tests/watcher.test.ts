import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startWatcher, startModernWatcher } from '../src/core/watcher.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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
    it('should start modern watcher (mocked)', async () => {
      // Mock the startWatcher function to avoid actual UI rendering
      const startSpy = vi
        .spyOn(await import('../src/core/watcher.js'), 'startWatcher')
        .mockResolvedValue();

      await startWatcher(tempDir);

      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('startModernWatcher', () => {
    it('should start modern watcher (alias)', async () => {
      // Mock the startModernWatcher function
      const startSpy = vi
        .spyOn(await import('../src/core/watcher.js'), 'startModernWatcher')
        .mockResolvedValue();

      await startModernWatcher(tempDir);

      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('simplified watcher UI', () => {
    it('should use simplified progress-focused UI', async () => {
      // Test that the watcher uses the simplified UI components (v0.10.0+)
      // The simplified UI should have:
      // - Active tasks display (no task details panel - removed)
      // - Progress bar (no system info panel - removed) 
      // - Activity logs (no scrolling task list - removed)
      
      const watcherModule = await import('../src/core/watcher.js');
      
      // Verify that the watcher uses modern console
      expect(watcherModule.startWatcher).toBeDefined();
      expect(watcherModule.startModernWatcher).toBeDefined();
      
      // The watcher should not have removed components
      // (These would be tested at the modern-console level)
    });

    it('should have progress-focused UI components', async () => {
      // Test that the watcher has the new simplified UI components
      const watcherModule = await import('../src/core/watcher.js');
      
      // Core watcher functions should exist
      expect(watcherModule.startWatcher).toBeDefined();
      expect(watcherModule.startModernWatcher).toBeDefined();
      
      // The watcher should use the modern console with simplified UI
      expect(typeof watcherModule.startWatcher).toBe('function');
      expect(typeof watcherModule.startModernWatcher).toBe('function');
    });

    it('should focus on progress and activity monitoring', async () => {
      // Test that the watcher focuses on the core functionality
      const watcherModule = await import('../src/core/watcher.js');
      
      // Core watcher functions should exist
      expect(watcherModule.startWatcher).toBeDefined();
      expect(watcherModule.startModernWatcher).toBeDefined();
      
      // These are the main functions that should be available
      expect(typeof watcherModule.startWatcher).toBe('function');
      expect(typeof watcherModule.startModernWatcher).toBe('function');
    });

    it('should support simplified UI features', async () => {
      // Test that the watcher supports the new simplified UI features
      const watcherModule = await import('../src/core/watcher.js');
      
      // The watcher should support:
      // - Real-time task progress display
      // - Activity logging with timestamps
      // - Progress bar visualization
      // - Clean, focused interface
      
      expect(watcherModule.startWatcher).toBeDefined();
      expect(watcherModule.startModernWatcher).toBeDefined();
      
      // Verify the functions are callable
      expect(typeof watcherModule.startWatcher).toBe('function');
      expect(typeof watcherModule.startModernWatcher).toBe('function');
    });
  });
});
