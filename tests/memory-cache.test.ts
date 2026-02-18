import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { MemoryStore } from '../src/memory/memory-store.js';
import { MemoryCache } from '../src/memory/memory-cache.js';
import { HNSWIndex } from '../src/memory/hnsw-index.js';
import { vectorize } from '../src/memory/memory-vectorizer.js';
import type { Memory } from '../src/memory/memory-types.js';

describe('MemoryCache', () => {
  let testDir: string;
  let store: MemoryStore;
  let index: HNSWIndex;
  const dimensions = 256;

  function makeMemory(overrides: Partial<Memory> = {}): Memory {
    const now = Date.now();
    return {
      id: `mem-${Math.random().toString(36).slice(2)}`,
      type: 'observation',
      title: 'Test memory',
      content: 'Some content for testing purposes',
      project: 'test-project',
      tags: [],
      createdAt: now,
      updatedAt: now,
      accessedAt: now,
      ...overrides,
    };
  }

  function addMemory(mem: Memory): void {
    store.saveMemory(mem);
    const vec = vectorize(`${mem.title} ${mem.content}`, dimensions);
    index.add(mem.id, vec);
  }

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-cache-'));
    store = new MemoryStore(path.join(testDir, 'memory.db'));
    await store.initialize();
    index = new HNSWIndex({ dimensions });
  });

  afterEach(async () => {
    store.close();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('usage tracking', () => {
    it('should report current size', () => {
      const cache = new MemoryCache(store, index);
      expect(cache.getCurrentSize()).toBeGreaterThan(0);
    });

    it('should report usage percent', () => {
      const cache = new MemoryCache(store, index, 1000000); // 1MB limit
      const usage = cache.getUsagePercent();
      expect(usage).toBeGreaterThanOrEqual(0);
      expect(usage).toBeLessThanOrEqual(100);
    });
  });

  describe('checkAndEvict', () => {
    it('should not evict when under limit', () => {
      const cache = new MemoryCache(store, index, 100 * 1024 * 1024); // 100MB
      addMemory(makeMemory());

      const result = cache.checkAndEvict();
      expect(result.evictedCount).toBe(0);
      expect(result.freedBytes).toBe(0);
    });

    it('should evict when over limit', () => {
      // Set a very small limit to force eviction
      const cache = new MemoryCache(store, index, 1); // 1 byte limit

      for (let i = 0; i < 5; i++) {
        addMemory(makeMemory({ accessedAt: i }));
      }

      const result = cache.checkAndEvict();
      expect(result.evictedCount).toBeGreaterThan(0);
    });
  });

  describe('forceEvict', () => {
    it('should evict even when under limit', () => {
      const cache = new MemoryCache(store, index, 100 * 1024 * 1024); // 100MB

      for (let i = 0; i < 5; i++) {
        addMemory(makeMemory({ accessedAt: i }));
      }

      const result = cache.forceEvict();
      expect(result.evictedCount).toBeGreaterThan(0);
    });

    it('should protect decision type memories', () => {
      const cache = new MemoryCache(store, index, 1); // tiny limit

      addMemory(makeMemory({ id: 'decision-1', type: 'decision', accessedAt: 1 }));
      addMemory(makeMemory({ id: 'obs-1', type: 'observation', accessedAt: 1 }));
      addMemory(makeMemory({ id: 'obs-2', type: 'observation', accessedAt: 2 }));

      cache.forceEvict();

      // Decision should survive
      const decision = store.getMemory('decision-1');
      expect(decision).not.toBeNull();
    });

    it('should remove HNSW vectors on eviction', () => {
      const cache = new MemoryCache(store, index, 1);

      const mem = makeMemory({ id: 'to-evict', accessedAt: 1 });
      addMemory(mem);
      expect(index.size).toBe(1);

      cache.forceEvict();

      // HNSW should also have been cleaned
      expect(index.size).toBe(0);
    });
  });
});
