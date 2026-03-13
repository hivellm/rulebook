import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LearnManager } from '../src/core/learn-manager.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('LearnManager', () => {
  let testDir: string;
  let mgr: LearnManager;

  beforeEach(async () => {
    testDir = join(tmpdir(), `rulebook-test-learn-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    mgr = new LearnManager(testDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('capture', () => {
    it('should create a learning entry', async () => {
      const l = await mgr.capture('JSONB gotcha', 'Empty arrays return null');
      expect(l.title).toBe('JSONB gotcha');
      expect(l.content).toBe('Empty arrays return null');
      expect(l.source).toBe('manual');
      expect(l.id).toContain('jsonb-gotcha');
    });

    it('should create md and metadata files', async () => {
      const l = await mgr.capture('Test Learning', 'content');
      const dir = join(testDir, '.rulebook', 'learnings');
      const files = await fs.readdir(dir);
      expect(files.some(f => f.endsWith('.md') && f.includes('test-learning'))).toBe(true);
      expect(files.some(f => f.endsWith('.metadata.json') && f.includes('test-learning'))).toBe(true);
    });

    it('should store tags and related task', async () => {
      const l = await mgr.capture('Learn', 'content', {
        tags: ['db', 'postgres'],
        relatedTask: 'feature-auth',
        source: 'task-archive',
      });
      expect(l.tags).toEqual(['db', 'postgres']);
      expect(l.relatedTask).toBe('feature-auth');
      expect(l.source).toBe('task-archive');
    });
  });

  describe('list', () => {
    it('should return empty when no learnings', async () => {
      const list = await mgr.list();
      expect(list).toEqual([]);
    });

    it('should return learnings sorted newest first', async () => {
      await mgr.capture('First', 'content1');
      // Small delay to ensure different timestamps
      await new Promise(r => setTimeout(r, 10));
      await mgr.capture('Second', 'content2');
      const list = await mgr.list();
      expect(list.length).toBe(2);
      expect(list[0].title).toBe('Second');
    });

    it('should respect limit', async () => {
      await mgr.capture('A', 'a');
      await mgr.capture('B', 'b');
      await mgr.capture('C', 'c');
      const list = await mgr.list(2);
      expect(list.length).toBe(2);
    });
  });

  describe('show', () => {
    it('should return null for non-existent', async () => {
      const result = await mgr.show('nonexistent');
      expect(result).toBeNull();
    });

    it('should return learning and content', async () => {
      const l = await mgr.capture('Test Show', 'The content');
      const result = await mgr.show(l.id);
      expect(result).not.toBeNull();
      expect(result!.learning.title).toBe('Test Show');
      expect(result!.content).toContain('The content');
    });
  });

  describe('fromRalph', () => {
    it('should return empty when no ralph history', async () => {
      const learnings = await mgr.fromRalph();
      expect(learnings).toEqual([]);
    });

    it('should extract learnings from ralph iterations', async () => {
      // Create mock ralph history
      const historyDir = join(testDir, '.rulebook', 'ralph', 'history');
      await fs.mkdir(historyDir, { recursive: true });
      await fs.writeFile(
        join(historyDir, 'iteration-1.json'),
        JSON.stringify({
          iteration: 1,
          task_id: 'US-001',
          learnings: ['Always validate input', 'Use parameterized queries'],
        })
      );
      await fs.writeFile(
        join(historyDir, 'iteration-2.json'),
        JSON.stringify({
          iteration: 2,
          task_id: 'US-002',
          learnings: [],
        })
      );

      const learnings = await mgr.fromRalph();
      expect(learnings.length).toBe(2);
      expect(learnings[0].source).toBe('ralph');
      expect(learnings[0].relatedTask).toBe('US-001');
    });

    it('should deduplicate on second run', async () => {
      const historyDir = join(testDir, '.rulebook', 'ralph', 'history');
      await fs.mkdir(historyDir, { recursive: true });
      await fs.writeFile(
        join(historyDir, 'iteration-1.json'),
        JSON.stringify({
          iteration: 1,
          task_id: 'US-001',
          learnings: ['Important lesson'],
        })
      );

      const first = await mgr.fromRalph();
      expect(first.length).toBe(1);

      const second = await mgr.fromRalph();
      expect(second.length).toBe(0);
    });
  });

  describe('promote', () => {
    it('should return null for non-existent learning', async () => {
      const result = await mgr.promote('nonexistent', 'knowledge');
      expect(result).toBeNull();
    });

    it('should promote to knowledge entry', async () => {
      const l = await mgr.capture('Pattern Found', 'Always use repos for DB access');
      const result = await mgr.promote(l.id, 'knowledge');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('knowledge');

      // Check learning marked as promoted
      const updated = await mgr.show(l.id);
      expect(updated!.learning.promotedTo).toEqual({
        type: 'knowledge',
        id: result!.id,
      });
    });

    it('should promote to decision', async () => {
      const l = await mgr.capture('Should use Redis', 'Redis is faster for caching');
      const result = await mgr.promote(l.id, 'decision');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('decision');

      // Check learning marked as promoted
      const updated = await mgr.show(l.id);
      expect(updated!.learning.promotedTo!.type).toBe('decision');
    });

    it('should use custom title when provided', async () => {
      const l = await mgr.capture('Raw learning', 'Content here');
      const result = await mgr.promote(l.id, 'knowledge', { title: 'Polished Pattern' });
      expect(result).not.toBeNull();

      // Verify knowledge entry has custom title
      const { KnowledgeManager } = await import('../src/core/knowledge-manager.js');
      const km = new KnowledgeManager(testDir);
      const entry = await km.show(result!.id);
      expect(entry!.entry.title).toBe('Polished Pattern');
    });
  });
});
