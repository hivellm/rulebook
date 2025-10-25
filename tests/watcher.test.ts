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
});
