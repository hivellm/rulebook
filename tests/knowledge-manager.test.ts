import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeManager } from '../src/core/knowledge-manager.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('KnowledgeManager', () => {
  let testDir: string;
  let mgr: KnowledgeManager;

  beforeEach(async () => {
    testDir = join(tmpdir(), `rulebook-test-knowledge-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    mgr = new KnowledgeManager(testDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('add', () => {
    it('should create a pattern entry', async () => {
      const entry = await mgr.add('pattern', 'Repository Pattern', {
        category: 'architecture',
        description: 'All DB access via repositories',
      });
      expect(entry.id).toBe('repository-pattern');
      expect(entry.type).toBe('pattern');
      expect(entry.category).toBe('architecture');
    });

    it('should create an anti-pattern entry', async () => {
      const entry = await mgr.add('anti-pattern', 'God Object', {
        category: 'code',
        description: 'One class does everything',
      });
      expect(entry.id).toBe('god-object');
      expect(entry.type).toBe('anti-pattern');
    });

    it('should create files in correct directory', async () => {
      await mgr.add('pattern', 'Error Boundary', {
        category: 'code',
        description: 'Wrap components in error boundaries',
      });
      const dir = join(testDir, '.rulebook', 'knowledge', 'patterns');
      const files = await fs.readdir(dir);
      expect(files).toContain('error-boundary.md');
      expect(files).toContain('error-boundary.metadata.json');
    });

    it('should store optional fields', async () => {
      const entry = await mgr.add('pattern', 'Retry Pattern', {
        category: 'code',
        description: 'Retry on transient failures',
        example: '```ts\nawait retry(() => fetch(url));\n```',
        whenToUse: 'Network calls',
        whenNotToUse: 'Idempotent operations only',
        tags: ['resilience', 'network'],
      });
      expect(entry.example).toContain('retry');
      expect(entry.whenToUse).toBe('Network calls');
      expect(entry.tags).toEqual(['resilience', 'network']);
    });

    it('should default source to manual', async () => {
      const entry = await mgr.add('pattern', 'Test', {
        category: 'testing',
        description: 'test',
      });
      expect(entry.source).toBe('manual');
    });
  });

  describe('list', () => {
    it('should return empty when no entries', async () => {
      const list = await mgr.list();
      expect(list).toEqual([]);
    });

    it('should return all entries', async () => {
      await mgr.add('pattern', 'A', { category: 'code', description: 'a' });
      await mgr.add('anti-pattern', 'B', { category: 'code', description: 'b' });
      const list = await mgr.list();
      expect(list.length).toBe(2);
    });

    it('should filter by type', async () => {
      await mgr.add('pattern', 'P1', { category: 'code', description: 'p1' });
      await mgr.add('anti-pattern', 'AP1', { category: 'code', description: 'ap1' });
      const patterns = await mgr.list('pattern');
      expect(patterns.length).toBe(1);
      expect(patterns[0].type).toBe('pattern');
    });

    it('should filter by category', async () => {
      await mgr.add('pattern', 'Arch', { category: 'architecture', description: 'a' });
      await mgr.add('pattern', 'Code', { category: 'code', description: 'c' });
      const arch = await mgr.list(undefined, 'architecture');
      expect(arch.length).toBe(1);
      expect(arch[0].category).toBe('architecture');
    });

    it('should filter by both type and category', async () => {
      await mgr.add('pattern', 'P-Arch', { category: 'architecture', description: 'a' });
      await mgr.add('pattern', 'P-Code', { category: 'code', description: 'c' });
      await mgr.add('anti-pattern', 'AP-Arch', { category: 'architecture', description: 'a' });
      const result = await mgr.list('pattern', 'architecture');
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('P-Arch');
    });
  });

  describe('show', () => {
    it('should return null for non-existent', async () => {
      const result = await mgr.show('nonexistent');
      expect(result).toBeNull();
    });

    it('should return entry and content', async () => {
      await mgr.add('pattern', 'Repository Pattern', {
        category: 'architecture',
        description: 'Access DB via repos',
      });
      const result = await mgr.show('repository-pattern');
      expect(result).not.toBeNull();
      expect(result!.entry.title).toBe('Repository Pattern');
      expect(result!.content).toContain('Access DB via repos');
    });
  });

  describe('remove', () => {
    it('should return false for non-existent', async () => {
      const ok = await mgr.remove('nonexistent');
      expect(ok).toBe(false);
    });

    it('should delete both files', async () => {
      await mgr.add('pattern', 'To Remove', { category: 'code', description: 'bye' });
      const ok = await mgr.remove('to-remove');
      expect(ok).toBe(true);

      const result = await mgr.show('to-remove');
      expect(result).toBeNull();
    });
  });

  describe('getForGenerator', () => {
    it('should return empty string when no entries', async () => {
      const content = await mgr.getForGenerator();
      expect(content).toBe('');
    });

    it('should include patterns and anti-patterns sections', async () => {
      await mgr.add('pattern', 'Repository', { category: 'architecture', description: 'a' });
      await mgr.add('anti-pattern', 'God Object', { category: 'code', description: 'b' });
      const content = await mgr.getForGenerator();
      expect(content).toContain('Project Knowledge');
      expect(content).toContain('Patterns');
      expect(content).toContain('Repository');
      expect(content).toContain('Anti-Patterns to Avoid');
      expect(content).toContain('God Object');
    });

    it('should only show patterns section if no anti-patterns', async () => {
      await mgr.add('pattern', 'Singleton', { category: 'code', description: 'a' });
      const content = await mgr.getForGenerator();
      expect(content).toContain('Patterns');
      expect(content).not.toContain('Anti-Patterns');
    });
  });
});
