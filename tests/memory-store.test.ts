import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { MemoryStore } from '../src/memory/memory-store.js';
import type { Memory, MemorySession } from '../src/memory/memory-types.js';

describe('MemoryStore', () => {
  let testDir: string;
  let store: MemoryStore;

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
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-store-'));
    store = new MemoryStore(path.join(testDir, 'memory.db'));
    await store.initialize();
  });

  afterEach(async () => {
    store.close();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('should initialize and create database', async () => {
      expect(store.getMemoryCount()).toBe(0);
    });

    it('should be idempotent (double init)', async () => {
      await store.initialize();
      expect(store.getMemoryCount()).toBe(0);
    });
  });

  describe('memory CRUD', () => {
    it('should save and retrieve a memory', () => {
      const mem = makeMemory({ title: 'Auth bug fix' });
      store.saveMemory(mem);

      const loaded = store.getMemory(mem.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.title).toBe('Auth bug fix');
      expect(loaded!.type).toBe('observation');
      expect(loaded!.tags).toEqual(['test']);
    });

    it('should return null for non-existent memory', () => {
      expect(store.getMemory('nonexistent')).toBeNull();
    });

    it('should delete a memory', () => {
      const mem = makeMemory();
      store.saveMemory(mem);
      expect(store.getMemoryCount()).toBe(1);

      store.deleteMemory(mem.id);
      expect(store.getMemoryCount()).toBe(0);
      expect(store.getMemory(mem.id)).toBeNull();
    });

    it('should list memories sorted by created_at DESC', () => {
      const m1 = makeMemory({ title: 'First', createdAt: 1000 });
      const m2 = makeMemory({ title: 'Second', createdAt: 2000 });
      const m3 = makeMemory({ title: 'Third', createdAt: 3000 });

      store.saveMemory(m1);
      store.saveMemory(m2);
      store.saveMemory(m3);

      const list = store.listMemories();
      expect(list).toHaveLength(3);
      expect(list[0].title).toBe('Third');
      expect(list[2].title).toBe('First');
    });

    it('should filter list by type', () => {
      store.saveMemory(makeMemory({ type: 'bugfix' }));
      store.saveMemory(makeMemory({ type: 'feature' }));
      store.saveMemory(makeMemory({ type: 'bugfix' }));

      const bugs = store.listMemories({ type: 'bugfix' });
      expect(bugs).toHaveLength(2);
    });

    it('should limit list results', () => {
      for (let i = 0; i < 10; i++) {
        store.saveMemory(makeMemory());
      }

      const list = store.listMemories({ limit: 3 });
      expect(list).toHaveLength(3);
    });

    it('should update memory on save with same ID', () => {
      const mem = makeMemory({ title: 'Original' });
      store.saveMemory(mem);

      store.saveMemory({ ...mem, title: 'Updated' });
      const loaded = store.getMemory(mem.id);
      expect(loaded!.title).toBe('Updated');
      expect(store.getMemoryCount()).toBe(1);
    });

    it('should update accessed_at timestamp', () => {
      const mem = makeMemory({ accessedAt: 1000 });
      store.saveMemory(mem);

      store.updateAccessedAt(mem.id);
      const loaded = store.getMemory(mem.id);
      expect(loaded!.accessedAt).toBeGreaterThan(1000);
    });
  });

  describe('BM25 search', () => {
    it('should find memories by keyword', () => {
      store.saveMemory(
        makeMemory({
          title: 'Fix authentication bug',
          content: 'Fixed login failure in auth module',
        })
      );
      store.saveMemory(
        makeMemory({
          title: 'Add database migration',
          content: 'Created user table migration',
        })
      );

      const results = store.searchBM25('authentication login');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should return empty for no matches', () => {
      store.saveMemory(makeMemory({ title: 'Test', content: 'content' }));
      const results = store.searchBM25('zzzznonexistent');
      expect(results).toHaveLength(0);
    });

    it('should return empty for empty query', () => {
      const results = store.searchBM25('');
      expect(results).toHaveLength(0);
    });
  });

  describe('sessions', () => {
    it('should create and retrieve active session', () => {
      const session: MemorySession = {
        id: 'session-1',
        project: 'test-project',
        status: 'active',
        startedAt: Date.now(),
        toolCalls: 0,
      };

      store.createSession(session);
      const active = store.getActiveSession();
      expect(active).not.toBeNull();
      expect(active!.id).toBe('session-1');
      expect(active!.status).toBe('active');
    });

    it('should end a session', () => {
      const session: MemorySession = {
        id: 'session-2',
        project: 'test-project',
        status: 'active',
        startedAt: Date.now(),
        toolCalls: 5,
      };

      store.createSession(session);
      store.endSession('session-2', 'Completed auth work');

      const active = store.getActiveSession();
      expect(active).toBeNull();
    });

    it('should count sessions', () => {
      expect(store.getSessionCount()).toBe(0);

      store.createSession({
        id: 's1',
        project: 'p',
        status: 'completed',
        startedAt: Date.now(),
        toolCalls: 0,
      });

      expect(store.getSessionCount()).toBe(1);
    });
  });

  describe('persistence', () => {
    it('should persist and reload data', async () => {
      store.saveMemory(makeMemory({ id: 'persist-test', title: 'Persisted' }));
      store.close();

      // Re-open
      const store2 = new MemoryStore(path.join(testDir, 'memory.db'));
      await store2.initialize();

      const loaded = store2.getMemory('persist-test');
      expect(loaded).not.toBeNull();
      expect(loaded!.title).toBe('Persisted');

      store2.close();
    });

    it('should report database size', () => {
      const size = store.getDbSizeBytes();
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('timeline', () => {
    it('should get memories around an anchor', () => {
      for (let i = 1; i <= 10; i++) {
        store.saveMemory(
          makeMemory({
            id: `tl-${i}`,
            title: `Memory ${i}`,
            createdAt: i * 1000,
          })
        );
      }

      const timeline = store.getTimelineAround('tl-5', 2);
      expect(timeline.length).toBeGreaterThan(0);
      // Should include anchor and surrounding memories
      const ids = timeline.map((t) => t.id);
      expect(ids).toContain('tl-5');
    });

    it('should return empty for non-existent anchor', () => {
      const timeline = store.getTimelineAround('nonexistent', 2);
      expect(timeline).toHaveLength(0);
    });
  });

  describe('eviction candidates', () => {
    it('should exclude decision type', () => {
      store.saveMemory(makeMemory({ id: 'dec-1', type: 'decision', accessedAt: 1 }));
      store.saveMemory(makeMemory({ id: 'obs-1', type: 'observation', accessedAt: 1 }));

      const candidates = store.getEvictionCandidates(10);
      const ids = candidates.map((c) => c.id);
      expect(ids).toContain('obs-1');
      expect(ids).not.toContain('dec-1');
    });

    it('should sort by accessed_at ascending', () => {
      store.saveMemory(makeMemory({ id: 'new', accessedAt: 9999 }));
      store.saveMemory(makeMemory({ id: 'old', accessedAt: 1 }));

      const candidates = store.getEvictionCandidates(10);
      expect(candidates[0].id).toBe('old');
    });
  });
});
