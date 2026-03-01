import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { MemoryStore } from '../src/memory/memory-store.js';
import type { Memory } from '../src/memory/memory-types.js';

/**
 * Tests for memory-per-project persistence fix.
 *
 * Verifies that the memory.db file is created on disk immediately after
 * initialize(), and that data persists without requiring 50 writes or
 * an explicit close().
 */
describe('Memory Per-Project Persistence', () => {
  let testDir: string;

  function makeMemory(overrides: Partial<Memory> = {}): Memory {
    const now = Date.now();
    return {
      id: `mem-${Math.random().toString(36).slice(2)}`,
      type: 'observation',
      title: 'Test memory',
      content: 'Some content for testing',
      project: 'test-project',
      tags: ['test'],
      createdAt: now,
      updatedAt: now,
      accessedAt: now,
      ...overrides,
    };
  }

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-mpp-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('DB file exists after initialize()', () => {
    it('should create the .db file on disk immediately after initialize()', async () => {
      const dbPath = path.join(testDir, 'memory', 'memory.db');

      // File should not exist before initialization
      expect(existsSync(dbPath)).toBe(false);

      const store = new MemoryStore(dbPath);
      await store.initialize();

      // File MUST exist on disk right after initialize() — this is the core fix
      expect(existsSync(dbPath)).toBe(true);

      store.close();
    });

    it('should create parent directories if they do not exist', async () => {
      const dbPath = path.join(testDir, 'deep', 'nested', 'dir', 'memory.db');

      const store = new MemoryStore(dbPath);
      await store.initialize();

      expect(existsSync(dbPath)).toBe(true);

      store.close();
    });
  });

  describe('single write persistence', () => {
    it('should persist a single saveMemory() without needing 50 writes', async () => {
      const dbPath = path.join(testDir, 'memory.db');

      const store = new MemoryStore(dbPath);
      await store.initialize();

      const mem = makeMemory({ id: 'single-write-test', title: 'Single write' });
      store.saveMemory(mem);

      // Explicitly save to disk (the fix ensures initialize already saved the schema)
      store.saveToDisk();

      // Re-open the store from disk without calling close() on the first one
      const store2 = new MemoryStore(dbPath);
      await store2.initialize();

      const loaded = store2.getMemory('single-write-test');
      expect(loaded).not.toBeNull();
      expect(loaded!.title).toBe('Single write');

      store.close();
      store2.close();
    });
  });

  describe('getStats after first save', () => {
    it('should report non-zero DB size immediately after initialize()', async () => {
      const dbPath = path.join(testDir, 'memory.db');

      const store = new MemoryStore(dbPath);
      await store.initialize();

      // DB size should be > 0 since the schema was created and saved
      const size = store.getDbSizeBytes();
      expect(size).toBeGreaterThan(0);

      store.close();
    });

    it('should show correct memory count after saving', async () => {
      const dbPath = path.join(testDir, 'memory.db');

      const store = new MemoryStore(dbPath);
      await store.initialize();

      store.saveMemory(makeMemory());
      store.saveMemory(makeMemory());

      expect(store.getMemoryCount()).toBe(2);

      store.close();
    });
  });

  describe('file on disk survives reopen', () => {
    it('should survive close and reopen cycle', async () => {
      const dbPath = path.join(testDir, 'memory.db');

      // First session
      const store1 = new MemoryStore(dbPath);
      await store1.initialize();
      store1.saveMemory(makeMemory({ id: 'persist-1', title: 'From session 1' }));
      store1.close();

      // Verify file still exists
      expect(existsSync(dbPath)).toBe(true);

      // Second session
      const store2 = new MemoryStore(dbPath);
      await store2.initialize();

      const loaded = store2.getMemory('persist-1');
      expect(loaded).not.toBeNull();
      expect(loaded!.title).toBe('From session 1');

      // Add more data in second session
      store2.saveMemory(makeMemory({ id: 'persist-2', title: 'From session 2' }));
      store2.close();

      // Third session — both should be present
      const store3 = new MemoryStore(dbPath);
      await store3.initialize();

      expect(store3.getMemory('persist-1')).not.toBeNull();
      expect(store3.getMemory('persist-2')).not.toBeNull();
      expect(store3.getMemoryCount()).toBe(2);

      store3.close();
    });

    it('should persist even without explicit close() thanks to initialize() saveToDisk', async () => {
      const dbPath = path.join(testDir, 'memory.db');

      const store = new MemoryStore(dbPath);
      await store.initialize();

      // DO NOT call store.close() — the fix ensures the empty DB is already on disk

      // Reopen and verify the file is valid
      const store2 = new MemoryStore(dbPath);
      await store2.initialize();

      // Should work fine — schema is already persisted
      expect(store2.getMemoryCount()).toBe(0);

      store.close();
      store2.close();
    });
  });
});
