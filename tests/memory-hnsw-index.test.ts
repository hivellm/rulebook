import { describe, it, expect } from 'vitest';
import { HNSWIndex } from '../src/memory/hnsw-index.js';
import { vectorize } from '../src/memory/memory-vectorizer.js';

describe('HNSW Index', () => {
  const dimensions = 256;

  function createIndex(): HNSWIndex {
    return new HNSWIndex({ dimensions, M: 16, efConstruction: 200 });
  }

  function makeVector(text: string): Float32Array {
    return vectorize(text, dimensions);
  }

  describe('basic operations', () => {
    it('should start empty', () => {
      const index = createIndex();
      expect(index.size).toBe(0);
    });

    it('should add vectors and increase size', () => {
      const index = createIndex();
      index.add('a', makeVector('authentication'));
      index.add('b', makeVector('database'));
      expect(index.size).toBe(2);
    });

    it('should replace existing label on re-add', () => {
      const index = createIndex();
      index.add('a', makeVector('authentication'));
      index.add('a', makeVector('database'));
      expect(index.size).toBe(1);
    });

    it('should throw on dimension mismatch', () => {
      const index = createIndex();
      expect(() => index.add('a', new Float32Array(128))).toThrow('dimensions mismatch');
    });
  });

  describe('search', () => {
    it('should return empty for empty index', () => {
      const index = createIndex();
      const results = index.search(makeVector('test'), 5);
      expect(results).toEqual([]);
    });

    it('should find nearest neighbors', () => {
      const index = createIndex();
      index.add('auth', makeVector('authentication login security'));
      index.add('db', makeVector('database schema migration'));
      index.add('test', makeVector('unit testing coverage'));

      const results = index.search(makeVector('login authentication'), 3);
      expect(results.length).toBeGreaterThan(0);
      // 'auth' should be closest to 'login authentication'
      expect(results[0].label).toBe('auth');
    });

    it('should return at most k results', () => {
      const index = createIndex();
      for (let i = 0; i < 10; i++) {
        index.add(`item-${i}`, makeVector(`word${i} content text`));
      }

      const results = index.search(makeVector('content text'), 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should return all if k > size', () => {
      const index = createIndex();
      index.add('a', makeVector('hello'));
      index.add('b', makeVector('world'));

      const results = index.search(makeVector('hello'), 10);
      expect(results.length).toBe(2);
    });

    it('should sort by distance (closest first)', () => {
      const index = createIndex();
      index.add('auth', makeVector('authentication login'));
      index.add('db', makeVector('database'));
      index.add('test', makeVector('testing'));

      const results = index.search(makeVector('authentication'), 3);
      for (let i = 1; i < results.length; i++) {
        expect(results[i].distance).toBeGreaterThanOrEqual(results[i - 1].distance);
      }
    });

    it('should throw on query dimension mismatch', () => {
      const index = createIndex();
      index.add('a', makeVector('test'));
      expect(() => index.search(new Float32Array(128), 5)).toThrow('dimensions mismatch');
    });
  });

  describe('remove', () => {
    it('should reduce size on remove', () => {
      const index = createIndex();
      index.add('a', makeVector('hello'));
      index.add('b', makeVector('world'));
      expect(index.size).toBe(2);

      index.remove('a');
      expect(index.size).toBe(1);
    });

    it('should not fail on removing non-existent label', () => {
      const index = createIndex();
      expect(() => index.remove('nonexistent')).not.toThrow();
    });

    it('should still find remaining items after remove', () => {
      const index = createIndex();
      index.add('a', makeVector('authentication'));
      index.add('b', makeVector('database'));
      index.add('c', makeVector('testing'));

      index.remove('a');

      const results = index.search(makeVector('database'), 2);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].label).toBe('b');
    });

    it('should handle removing entry point', () => {
      const index = createIndex();
      index.add('a', makeVector('first'));
      index.add('b', makeVector('second'));

      // Remove first item (likely entry point)
      index.remove('a');
      expect(index.size).toBe(1);

      // Should still work
      const results = index.search(makeVector('second'), 1);
      expect(results.length).toBe(1);
    });
  });

  describe('serialize / deserialize', () => {
    it('should roundtrip with empty index', () => {
      const index = createIndex();
      const buffer = index.serialize();
      const restored = HNSWIndex.deserialize(buffer);
      expect(restored.size).toBe(0);
    });

    it('should roundtrip with data', () => {
      const index = createIndex();
      index.add('auth', makeVector('authentication login security'));
      index.add('db', makeVector('database schema migration'));
      index.add('test', makeVector('unit testing coverage'));

      const buffer = index.serialize();
      const restored = HNSWIndex.deserialize(buffer);

      expect(restored.size).toBe(3);

      // Search should still work
      const results = restored.search(makeVector('authentication login'), 3);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].label).toBe('auth');
    });

    it('should preserve search quality after roundtrip', () => {
      const index = createIndex();
      const texts = [
        'fix authentication bug causing login failures',
        'add database migration for user table',
        'refactor payment processing module',
        'update deployment pipeline configuration',
        'discovered memory leak in event handler',
      ];

      texts.forEach((text, i) => index.add(`item-${i}`, makeVector(text)));

      const query = makeVector('authentication login bug');
      const originalResults = index.search(query, 3);

      const buffer = index.serialize();
      const restored = HNSWIndex.deserialize(buffer);
      const restoredResults = restored.search(query, 3);

      // Same top results
      expect(restoredResults.map((r) => r.label)).toEqual(originalResults.map((r) => r.label));
    });

    it('should throw on invalid magic number', () => {
      const buffer = new ArrayBuffer(32);
      const view = new DataView(buffer);
      view.setUint32(0, 0x00000000, true); // wrong magic

      expect(() => HNSWIndex.deserialize(buffer)).toThrow('Invalid HNSW');
    });
  });

  describe('scale test', () => {
    it('should handle 100 vectors', () => {
      const index = createIndex();
      for (let i = 0; i < 100; i++) {
        index.add(`item-${i}`, makeVector(`document number ${i} with content`));
      }

      expect(index.size).toBe(100);

      const results = index.search(makeVector('document content'), 10);
      expect(results.length).toBe(10);
      // All distances should be non-negative
      for (const r of results) {
        expect(r.distance).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
