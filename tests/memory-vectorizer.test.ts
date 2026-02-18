import { describe, it, expect } from 'vitest';
import { fnv1a, tokenize, vectorize, cosineSimilarity } from '../src/memory/memory-vectorizer.js';

describe('Memory Vectorizer', () => {
  describe('fnv1a', () => {
    it('should produce deterministic hashes', () => {
      expect(fnv1a('hello')).toBe(fnv1a('hello'));
      expect(fnv1a('world')).toBe(fnv1a('world'));
    });

    it('should produce different hashes for different strings', () => {
      expect(fnv1a('hello')).not.toBe(fnv1a('world'));
    });

    it('should return unsigned 32-bit integers', () => {
      const hash = fnv1a('test');
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
    });
  });

  describe('tokenize', () => {
    it('should lowercase and split on non-word chars', () => {
      const tokens = tokenize('Hello World! Testing 123');
      expect(tokens).toContain('hello');
      expect(tokens).toContain('world');
      expect(tokens).toContain('testing');
      expect(tokens).toContain('123');
    });

    it('should remove stop words', () => {
      const tokens = tokenize('the quick brown fox is a very fast animal');
      expect(tokens).not.toContain('the');
      expect(tokens).not.toContain('is');
      expect(tokens).not.toContain('a');
      expect(tokens).not.toContain('very');
      expect(tokens).toContain('quick');
      expect(tokens).toContain('brown');
      expect(tokens).toContain('fox');
      expect(tokens).toContain('fast');
      expect(tokens).toContain('animal');
    });

    it('should filter single-character tokens', () => {
      const tokens = tokenize('I am a b c test');
      expect(tokens).not.toContain('b');
      expect(tokens).not.toContain('c');
      expect(tokens).toContain('test');
    });

    it('should return empty array for empty string', () => {
      expect(tokenize('')).toEqual([]);
    });

    it('should return empty array for string with only stop words', () => {
      expect(tokenize('the a an is are')).toEqual([]);
    });
  });

  describe('vectorize', () => {
    it('should produce fixed-dimension output (default 256)', () => {
      const vec = vectorize('testing the vectorizer');
      expect(vec).toBeInstanceOf(Float32Array);
      expect(vec.length).toBe(256);
    });

    it('should produce custom dimension output', () => {
      const vec = vectorize('testing', 128);
      expect(vec.length).toBe(128);
    });

    it('should be deterministic (same text -> same vector)', () => {
      const v1 = vectorize('authentication bug fix');
      const v2 = vectorize('authentication bug fix');
      expect(Array.from(v1)).toEqual(Array.from(v2));
    });

    it('should produce L2-normalized vectors (magnitude ~1.0)', () => {
      const vec = vectorize('this is a test of the vectorization system');
      let magnitude = 0;
      for (let i = 0; i < vec.length; i++) {
        magnitude += vec[i] * vec[i];
      }
      magnitude = Math.sqrt(magnitude);
      expect(magnitude).toBeCloseTo(1.0, 4);
    });

    it('should return zero vector for empty text', () => {
      const vec = vectorize('');
      const sum = Array.from(vec).reduce((s, v) => s + Math.abs(v), 0);
      expect(sum).toBe(0);
    });

    it('should return zero vector for text with only stop words', () => {
      const vec = vectorize('the a an is are');
      const sum = Array.from(vec).reduce((s, v) => s + Math.abs(v), 0);
      expect(sum).toBe(0);
    });

    it('should produce different vectors for different texts', () => {
      const v1 = vectorize('authentication security login');
      const v2 = vectorize('database schema migration');
      expect(Array.from(v1)).not.toEqual(Array.from(v2));
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1.0 for identical vectors', () => {
      const vec = vectorize('test query');
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0, 4);
    });

    it('should return high similarity for similar texts', () => {
      const v1 = vectorize('fix authentication bug login error');
      const v2 = vectorize('authentication bug fix login failure');
      expect(cosineSimilarity(v1, v2)).toBeGreaterThan(0.5);
    });

    it('should return lower similarity for different texts', () => {
      const v1 = vectorize('fix authentication bug');
      const v2 = vectorize('database schema migration deployment');
      const similar = cosineSimilarity(
        vectorize('fix authentication bug'),
        vectorize('authentication bug fix')
      );
      expect(cosineSimilarity(v1, v2)).toBeLessThan(similar);
    });

    it('should return 0 for zero vectors', () => {
      const zero = new Float32Array(256);
      const vec = vectorize('test');
      expect(cosineSimilarity(zero, vec)).toBe(0);
    });

    it('should throw on dimension mismatch', () => {
      const a = new Float32Array(128);
      const b = new Float32Array(256);
      expect(() => cosineSimilarity(a, b)).toThrow('dimensions mismatch');
    });
  });
});
