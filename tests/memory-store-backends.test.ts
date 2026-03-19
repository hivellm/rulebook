import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { MemoryStore } from '../src/memory/memory-store.js';
import type { Memory } from '../src/memory/memory-types.js';

/**
 * Tests for MemoryStore with the actual backend (better-sqlite3 on this machine).
 * Validates all CRUD operations, FTS5 search, sessions, code nodes, and persistence.
 */
describe('MemoryStore — Backend Integration', () => {
  let testDir: string;
  let dbPath: string;
  let store: MemoryStore;

  beforeEach(async () => {
    testDir = join(tmpdir(), `rulebook-memstore-test-${Date.now()}`);
    mkdirSync(join(testDir, 'memory'), { recursive: true });
    dbPath = join(testDir, 'memory', 'test.db');
    store = new MemoryStore(dbPath);
    await store.initialize();
  });

  afterEach(() => {
    try { store.close(); } catch { /* ignore */ }
    rmSync(testDir, { recursive: true, force: true });
  });

  // ── Initialization ──────────────────────────────────────────────

  describe('initialize', () => {
    it('should create the .db file on disk', () => {
      expect(existsSync(dbPath)).toBe(true);
    });

    it('should be idempotent — calling initialize twice is safe', async () => {
      await store.initialize(); // second call
      expect(store.getMemoryCount()).toBe(0);
    });

    it('should re-open existing database', async () => {
      // Insert data
      store.saveMemory(makeMemory('m1', 'test memory'));
      store.close();

      // Re-open
      const store2 = new MemoryStore(dbPath);
      await store2.initialize();
      const mem = store2.getMemory('m1');
      expect(mem).not.toBeNull();
      expect(mem!.title).toBe('test memory');
      store2.close();
    });
  });

  // ── Memory CRUD ─────────────────────────────────────────────────

  describe('saveMemory / getMemory', () => {
    it('should save and retrieve a memory', () => {
      store.saveMemory(makeMemory('m1', 'Hello World', 'Some content'));
      const mem = store.getMemory('m1');
      expect(mem).not.toBeNull();
      expect(mem!.id).toBe('m1');
      expect(mem!.title).toBe('Hello World');
      expect(mem!.content).toBe('Some content');
      expect(mem!.type).toBe('observation');
      expect(mem!.tags).toEqual(['test']);
    });

    it('should return null for non-existent memory', () => {
      expect(store.getMemory('nonexistent')).toBeNull();
    });

    it('should upsert on duplicate id', () => {
      store.saveMemory(makeMemory('m1', 'Version 1'));
      store.saveMemory(makeMemory('m1', 'Version 2'));
      const mem = store.getMemory('m1');
      expect(mem!.title).toBe('Version 2');
      expect(store.getMemoryCount()).toBe(1);
    });

    it('should handle special characters in content', () => {
      store.saveMemory(makeMemory('m1', "It's a test", "Content with 'quotes' and \"double quotes\""));
      const mem = store.getMemory('m1');
      expect(mem!.title).toBe("It's a test");
      expect(mem!.content).toContain("'quotes'");
    });
  });

  describe('deleteMemory', () => {
    it('should delete a memory', () => {
      store.saveMemory(makeMemory('m1', 'To delete'));
      expect(store.getMemory('m1')).not.toBeNull();
      store.deleteMemory('m1');
      expect(store.getMemory('m1')).toBeNull();
    });

    it('should not throw when deleting non-existent memory', () => {
      expect(() => store.deleteMemory('nonexistent')).not.toThrow();
    });
  });

  describe('listMemories', () => {
    it('should list all memories ordered by created_at DESC', () => {
      store.saveMemory(makeMemory('m1', 'First', 'c', Date.now() - 2000));
      store.saveMemory(makeMemory('m2', 'Second', 'c', Date.now() - 1000));
      store.saveMemory(makeMemory('m3', 'Third', 'c', Date.now()));

      const list = store.listMemories();
      expect(list).toHaveLength(3);
      expect(list[0].title).toBe('Third');
      expect(list[2].title).toBe('First');
    });

    it('should filter by type', () => {
      store.saveMemory(makeMemory('m1', 'Feature', 'c', Date.now(), 'feature'));
      store.saveMemory(makeMemory('m2', 'Bugfix', 'c', Date.now(), 'bugfix'));

      const features = store.listMemories({ type: 'feature' });
      expect(features).toHaveLength(1);
      expect(features[0].title).toBe('Feature');
    });

    it('should respect limit', () => {
      for (let i = 0; i < 10; i++) {
        store.saveMemory(makeMemory(`m${i}`, `Mem ${i}`));
      }
      const list = store.listMemories({ limit: 3 });
      expect(list).toHaveLength(3);
    });

    it('should respect offset', () => {
      for (let i = 0; i < 5; i++) {
        store.saveMemory(makeMemory(`m${i}`, `Mem ${i}`, 'c', Date.now() + i * 1000));
      }
      const list = store.listMemories({ limit: 2, offset: 2 });
      expect(list).toHaveLength(2);
    });
  });

  describe('getMemoryCount', () => {
    it('should return 0 for empty store', () => {
      expect(store.getMemoryCount()).toBe(0);
    });

    it('should count correctly after inserts and deletes', () => {
      store.saveMemory(makeMemory('m1', 'One'));
      store.saveMemory(makeMemory('m2', 'Two'));
      expect(store.getMemoryCount()).toBe(2);

      store.deleteMemory('m1');
      expect(store.getMemoryCount()).toBe(1);
    });
  });

  describe('updateAccessedAt', () => {
    it('should update accessed_at timestamp', () => {
      const before = Date.now() - 10000;
      store.saveMemory(makeMemory('m1', 'Test', 'c', before));
      store.updateAccessedAt('m1');
      const mem = store.getMemory('m1');
      expect(mem!.accessedAt).toBeGreaterThan(before);
    });
  });

  // ── BM25 Search ─────────────────────────────────────────────────

  describe('searchBM25', () => {
    it('should find memories by keyword', () => {
      store.saveMemory(makeMemory('m1', 'Authentication system', 'JWT tokens and OAuth'));
      store.saveMemory(makeMemory('m2', 'Database migration', 'PostgreSQL schema changes'));

      const results = store.searchBM25('authentication');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].id).toBe('m1');
    });

    it('should return empty for no matches', () => {
      store.saveMemory(makeMemory('m1', 'Hello', 'World'));
      const results = store.searchBM25('zzzznonexistent');
      expect(results).toHaveLength(0);
    });

    it('should return empty for empty query', () => {
      const results = store.searchBM25('');
      expect(results).toHaveLength(0);
    });

    it('should handle special characters in query without crashing', () => {
      store.saveMemory(makeMemory('m1', 'Test', 'Content'));
      // These should not throw
      expect(() => store.searchBM25("it's a test")).not.toThrow();
      expect(() => store.searchBM25('foo "bar" baz')).not.toThrow();
      expect(() => store.searchBM25('OR 1=1 --')).not.toThrow();
      expect(() => store.searchBM25('*(){}[]')).not.toThrow();
    });

    it('should respect limit', () => {
      for (let i = 0; i < 10; i++) {
        store.saveMemory(makeMemory(`m${i}`, `Search term ${i}`, `Content about search term ${i}`));
      }
      const results = store.searchBM25('search term', 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  // ── Sessions ────────────────────────────────────────────────────

  describe('sessions', () => {
    it('should create and retrieve active session', () => {
      store.createSession({
        id: 's1',
        project: 'test',
        status: 'active',
        startedAt: Date.now(),
        toolCalls: 0,
      });

      const session = store.getActiveSession();
      expect(session).not.toBeNull();
      expect(session!.id).toBe('s1');
      expect(session!.status).toBe('active');
    });

    it('should end session', () => {
      store.createSession({
        id: 's1',
        project: 'test',
        status: 'active',
        startedAt: Date.now(),
        toolCalls: 0,
      });

      store.endSession('s1', 'Session completed');
      const session = store.getActiveSession();
      expect(session).toBeNull(); // No active sessions
    });

    it('should count sessions', () => {
      expect(store.getSessionCount()).toBe(0);
      store.createSession({ id: 's1', project: 'test', status: 'active', startedAt: Date.now(), toolCalls: 0 });
      store.createSession({ id: 's2', project: 'test', status: 'active', startedAt: Date.now(), toolCalls: 0 });
      expect(store.getSessionCount()).toBe(2);
    });
  });

  // ── Timestamps ──────────────────────────────────────────────────

  describe('timestamps', () => {
    it('should return oldest memory timestamp', () => {
      const old = Date.now() - 10000;
      store.saveMemory(makeMemory('m1', 'Old', 'c', old));
      store.saveMemory(makeMemory('m2', 'New', 'c', Date.now()));
      expect(store.getOldestMemoryTimestamp()).toBe(old);
    });

    it('should return newest memory timestamp', () => {
      const now = Date.now();
      store.saveMemory(makeMemory('m1', 'Old', 'c', now - 10000));
      store.saveMemory(makeMemory('m2', 'New', 'c', now));
      expect(store.getNewestMemoryTimestamp()).toBe(now);
    });

    it('should return undefined for empty store', () => {
      expect(store.getOldestMemoryTimestamp()).toBeUndefined();
      expect(store.getNewestMemoryTimestamp()).toBeUndefined();
    });
  });

  // ── Eviction ────────────────────────────────────────────────────

  describe('eviction candidates', () => {
    it('should return candidates ordered by accessed_at ASC', () => {
      store.saveMemory(makeMemory('m1', 'Recent', 'c', Date.now()));
      store.saveMemory(makeMemory('m2', 'Old', 'c', Date.now() - 10000));
      // m2 has older accessed_at
      const candidates = store.getEvictionCandidates(10);
      expect(candidates.length).toBe(2);
      expect(candidates[0].id).toBe('m2'); // oldest first
    });

    it('should exclude decision type from eviction', () => {
      store.saveMemory(makeMemory('m1', 'Regular', 'c', Date.now(), 'observation'));
      store.saveMemory(makeMemory('m2', 'Decision', 'c', Date.now(), 'decision'));
      const candidates = store.getEvictionCandidates(10);
      expect(candidates).toHaveLength(1);
      expect(candidates[0].id).toBe('m1');
    });

    it('should respect batch size', () => {
      for (let i = 0; i < 10; i++) {
        store.saveMemory(makeMemory(`m${i}`, `Mem ${i}`));
      }
      const candidates = store.getEvictionCandidates(3);
      expect(candidates).toHaveLength(3);
    });
  });

  // ── Timeline ────────────────────────────────────────────────────

  describe('getTimelineAround', () => {
    it('should return memories around anchor point', () => {
      const base = Date.now();
      for (let i = 0; i < 5; i++) {
        store.saveMemory(makeMemory(`m${i}`, `Mem ${i}`, 'c', base + i * 1000));
      }

      const timeline = store.getTimelineAround('m2', 2);
      expect(timeline.length).toBeGreaterThanOrEqual(3); // at least before + anchor + after
    });

    it('should return empty for non-existent anchor', () => {
      const timeline = store.getTimelineAround('nonexistent', 5);
      expect(timeline).toHaveLength(0);
    });
  });

  // ── Persistence ─────────────────────────────────────────────────

  describe('persistence', () => {
    it('should report non-zero DB size after writes', () => {
      store.saveMemory(makeMemory('m1', 'Test', 'Some content'));
      store.saveToDisk();
      const size = store.getDbSizeBytes();
      expect(size).toBeGreaterThan(0);
    });

    it('should persist data across close/reopen', async () => {
      store.saveMemory(makeMemory('m1', 'Persistent', 'Data survives restart'));
      store.close();

      const store2 = new MemoryStore(dbPath);
      await store2.initialize();
      const mem = store2.getMemory('m1');
      expect(mem).not.toBeNull();
      expect(mem!.content).toBe('Data survives restart');
      store2.close();
    });

    it('should handle saveToDisk without error', () => {
      expect(() => store.saveToDisk()).not.toThrow();
    });
  });

  // ── Code Nodes (Background Indexer) ─────────────────────────────

  describe('code nodes', () => {
    it('should save and retrieve code node by hash', () => {
      store.saveCodeNode({
        id: 'node1',
        type: 'function',
        name: 'myFunc',
        filePath: '/src/index.ts',
        startLine: 1,
        endLine: 10,
        content: 'function myFunc() {}',
        hash: 'abc123',
        updatedAt: Date.now(),
      });

      const hash = store.getCodeNodeByHash('node1');
      expect(hash).toBe('abc123');
    });

    it('should get code node IDs by file path', () => {
      store.saveCodeNode({
        id: 'n1', type: 'function', name: 'f1', filePath: '/src/a.ts',
        startLine: 1, endLine: 5, content: 'code', hash: 'h1', updatedAt: Date.now(),
      });
      store.saveCodeNode({
        id: 'n2', type: 'function', name: 'f2', filePath: '/src/a.ts',
        startLine: 6, endLine: 10, content: 'code', hash: 'h2', updatedAt: Date.now(),
      });
      store.saveCodeNode({
        id: 'n3', type: 'function', name: 'f3', filePath: '/src/b.ts',
        startLine: 1, endLine: 5, content: 'code', hash: 'h3', updatedAt: Date.now(),
      });

      const ids = store.getCodeNodeIdsByFile('/src/a.ts');
      expect(ids).toHaveLength(2);
      expect(ids).toContain('n1');
      expect(ids).toContain('n2');
    });

    it('should delete code nodes by file path', () => {
      store.saveCodeNode({
        id: 'n1', type: 'function', name: 'f1', filePath: '/src/a.ts',
        startLine: 1, endLine: 5, content: 'code', hash: 'h1', updatedAt: Date.now(),
      });

      store.deleteCodeNodesByFile('/src/a.ts');
      expect(store.getCodeNodeIdsByFile('/src/a.ts')).toHaveLength(0);
    });

    it('should get full code node', () => {
      store.saveCodeNode({
        id: 'n1', type: 'class', name: 'MyClass', filePath: '/src/my.ts',
        startLine: 1, endLine: 50, content: 'class MyClass {}',
        summary: 'A test class', hash: 'xyz', updatedAt: 12345,
      });

      const node = store.getCodeNode('n1');
      expect(node).not.toBeNull();
      expect(node!.name).toBe('MyClass');
      expect(node!.type).toBe('class');
      expect(node!.filePath).toBe('/src/my.ts');
    });
  });

  // ── Code Edges ──────────────────────────────────────────────────

  describe('code edges', () => {
    it('should save code edge', () => {
      store.saveCodeNode({
        id: 'n1', type: 'function', name: 'f1', filePath: '/a.ts',
        startLine: 1, endLine: 5, content: 'c', hash: 'h1', updatedAt: Date.now(),
      });
      store.saveCodeNode({
        id: 'n2', type: 'function', name: 'f2', filePath: '/b.ts',
        startLine: 1, endLine: 5, content: 'c', hash: 'h2', updatedAt: Date.now(),
      });

      expect(() => {
        store.saveCodeEdge({
          id: 'e1', sourceId: 'n1', targetId: 'n2', type: 'imports', weight: 1.0,
        });
      }).not.toThrow();
    });
  });
});

// ── Helpers ─────────────────────────────────────────────────────────

function makeMemory(
  id: string,
  title: string,
  content = 'Test content',
  createdAt = Date.now(),
  type = 'observation'
): Memory {
  return {
    id,
    type: type as Memory['type'],
    title,
    content,
    project: 'test',
    tags: ['test'],
    createdAt,
    updatedAt: createdAt,
    accessedAt: createdAt,
  };
}
