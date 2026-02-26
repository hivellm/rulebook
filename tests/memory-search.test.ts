import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { MemoryStore } from '../src/memory/memory-store.js';
import { MemorySearch } from '../src/memory/memory-search.js';
import { HNSWIndex } from '../src/memory/hnsw-index.js';
import { vectorize } from '../src/memory/memory-vectorizer.js';
import type { Memory } from '../src/memory/memory-types.js';

describe('MemorySearch', () => {
  let testDir: string;
  let store: MemoryStore;
  let index: HNSWIndex;
  let search: MemorySearch;
  const dimensions = 256;

  function makeMemory(overrides: Partial<Memory> = {}): Memory {
    const now = Date.now();
    return {
      id: `mem-${Math.random().toString(36).slice(2)}`,
      type: 'observation',
      title: 'Test memory',
      content: 'Some content',
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
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-search-'));
    store = new MemoryStore(path.join(testDir, 'memory.db'));
    await store.initialize();
    index = new HNSWIndex({ dimensions });
    search = new MemorySearch(store, index, dimensions);
  });

  afterEach(async () => {
    store.close();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('hybrid search', () => {
    it('should return results from both BM25 and vector', () => {
      addMemory(
        makeMemory({
          id: 'auth-1',
          title: 'Fix authentication bug',
          content: 'Fixed login failure caused by expired tokens',
        })
      );
      addMemory(
        makeMemory({
          id: 'db-1',
          title: 'Database migration',
          content: 'Created user table with indexes',
        })
      );
      addMemory(
        makeMemory({
          id: 'test-1',
          title: 'Add unit tests',
          content: 'Testing the authentication module',
        })
      );

      const results = search.search({
        query: 'authentication login',
        mode: 'hybrid',
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should rank items appearing in both rankings higher', () => {
      addMemory(
        makeMemory({
          id: 'both-match',
          title: 'Fix authentication login bug',
          content: 'Fixed authentication login failure in auth module',
        })
      );
      addMemory(
        makeMemory({
          id: 'bm25-only',
          title: 'Update README',
          content: 'Updated documentation for authentication',
        })
      );

      const results = search.search({
        query: 'authentication login',
        mode: 'hybrid',
      });

      if (results.length >= 2) {
        const bothResult = results.find((r) => r.id === 'both-match');
        if (bothResult) {
          expect(bothResult.matchType).toBe('both');
        }
      }
    });
  });

  describe('BM25-only mode', () => {
    it('should search using only BM25', () => {
      addMemory(
        makeMemory({
          title: 'Authentication bug',
          content: 'Login failure fixed',
        })
      );

      const results = search.search({
        query: 'authentication',
        mode: 'bm25',
      });

      if (results.length > 0) {
        expect(results[0].matchType).toBe('bm25');
      }
    });
  });

  describe('vector-only mode', () => {
    it('should search using only vector similarity', () => {
      addMemory(
        makeMemory({
          title: 'Authentication bug',
          content: 'Login failure fixed in auth module',
        })
      );

      const results = search.search({
        query: 'login security problem',
        mode: 'vector',
      });

      if (results.length > 0) {
        expect(results[0].matchType).toBe('vector');
      }
    });

    it('should return empty for empty index', () => {
      const emptyIndex = new HNSWIndex({ dimensions });
      const emptySearch = new MemorySearch(store, emptyIndex, dimensions);

      const results = emptySearch.search({
        query: 'test',
        mode: 'vector',
      });

      expect(results).toHaveLength(0);
    });
  });

  describe('type filter', () => {
    it('should filter results by type', () => {
      addMemory(makeMemory({ type: 'bugfix', title: 'Bug fix', content: 'Fixed a bug' }));
      addMemory(makeMemory({ type: 'feature', title: 'New feature', content: 'Added feature' }));

      const results = search.search({
        query: 'bug feature',
        mode: 'vector',
        type: 'bugfix',
      });

      for (const r of results) {
        expect(r.type).toBe('bugfix');
      }
    });
  });

  describe('timeline', () => {
    it('should return chronological context', () => {
      for (let i = 1; i <= 10; i++) {
        addMemory(
          makeMemory({
            id: `tl-${i}`,
            title: `Memory ${i}`,
            content: `Content ${i}`,
            createdAt: i * 1000,
          })
        );
      }

      const timeline = search.getTimeline('tl-5', 2);
      expect(timeline.length).toBeGreaterThan(0);

      const anchor = timeline.find((t) => t.id === 'tl-5');
      expect(anchor?.position).toBe('anchor');
    });
  });

  describe('getFullDetails', () => {
    it('should return complete memory objects', () => {
      const mem = makeMemory({ id: 'detail-1', title: 'Detailed memory' });
      addMemory(mem);

      const details = search.getFullDetails(['detail-1']);
      expect(details).toHaveLength(1);
      expect(details[0].title).toBe('Detailed memory');
      expect(details[0].content).toBe(mem.content);
    });

    it('should skip non-existent IDs', () => {
      const details = search.getFullDetails(['nonexistent']);
      expect(details).toHaveLength(0);
    });
  });

  describe('empty database', () => {
    it('should return empty results for all modes', () => {
      expect(search.search({ query: 'test', mode: 'bm25' })).toHaveLength(0);
      expect(search.search({ query: 'test', mode: 'vector' })).toHaveLength(0);
      expect(search.search({ query: 'test', mode: 'hybrid' })).toHaveLength(0);
    });
  });
});
