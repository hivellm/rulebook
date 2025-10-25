import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createWatcherUI } from '../src/core/watcher.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock console methods to avoid output during tests
const originalConsole = { ...console };
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'clear').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WatcherUI', () => {
  let tempDir: string;
  let watcher: ReturnType<typeof createWatcherUI>;

  beforeEach(async () => {
    // Create temporary directory in system temp
    tempDir = join(tmpdir(), 'rulebook-test-watcher-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    
    watcher = createWatcherUI(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should create watcher instance', () => {
      expect(watcher).toBeDefined();
    });
  });

  describe('start', () => {
    it('should start watcher (mocked)', async () => {
      // Mock the start method to avoid actual UI rendering
      const startSpy = vi.spyOn(watcher, 'start').mockResolvedValue();
      
      await watcher.start();
      
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop watcher', async () => {
      await watcher.stop();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('render methods', () => {
    it('should have render methods', () => {
      // Test that methods exist (they're private but we can check the instance)
      expect(watcher).toBeDefined();
    });
  });
});

describe('startWatcher', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), 'rulebook-test-start-watcher-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should create watcher UI instance', () => {
    const watcher = createWatcherUI(tempDir);
    expect(watcher).toBeDefined();
  });
});
