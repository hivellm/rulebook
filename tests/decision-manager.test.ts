import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DecisionManager } from '../src/core/decision-manager.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('DecisionManager', () => {
  let testDir: string;
  let mgr: DecisionManager;

  beforeEach(async () => {
    testDir = join(tmpdir(), `rulebook-test-decision-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    mgr = new DecisionManager(testDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('create', () => {
    it('should create first decision with id 1', async () => {
      const d = await mgr.create('Use PostgreSQL');
      expect(d.id).toBe(1);
      expect(d.slug).toBe('use-postgresql');
      expect(d.title).toBe('Use PostgreSQL');
      expect(d.status).toBe('proposed');
    });

    it('should auto-increment id', async () => {
      await mgr.create('First');
      const second = await mgr.create('Second');
      expect(second.id).toBe(2);
    });

    it('should create markdown and metadata files', async () => {
      await mgr.create('Use REST API');
      const decisionsDir = join(testDir, '.rulebook', 'decisions');
      const files = await fs.readdir(decisionsDir);
      expect(files).toContain('001-use-rest-api.md');
      expect(files).toContain('001-use-rest-api.metadata.json');
    });

    it('should store context and alternatives', async () => {
      const d = await mgr.create('Use Redis', {
        context: 'Need caching',
        alternatives: ['Memcached', 'In-memory'],
        consequences: 'Must manage Redis cluster',
      });
      expect(d.context).toBe('Need caching');
      expect(d.alternatives).toEqual(['Memcached', 'In-memory']);
      expect(d.consequences).toBe('Must manage Redis cluster');
    });

    it('should accept custom status', async () => {
      const d = await mgr.create('Use TypeScript', { status: 'accepted' });
      expect(d.status).toBe('accepted');
    });

    it('should store related tasks', async () => {
      const d = await mgr.create('Use Docker', { relatedTasks: ['setup-infra', 'deploy-v2'] });
      expect(d.relatedTasks).toEqual(['setup-infra', 'deploy-v2']);
    });
  });

  describe('list', () => {
    it('should return empty array when no decisions', async () => {
      const list = await mgr.list();
      expect(list).toEqual([]);
    });

    it('should return all decisions sorted by id', async () => {
      await mgr.create('Third');
      await mgr.create('First');
      const list = await mgr.list();
      expect(list.length).toBe(2);
      expect(list[0].id).toBe(1);
      expect(list[1].id).toBe(2);
    });

    it('should filter by status', async () => {
      await mgr.create('Proposed One');
      await mgr.create('Accepted One', { status: 'accepted' });
      await mgr.create('Proposed Two');
      const accepted = await mgr.list('accepted');
      expect(accepted.length).toBe(1);
      expect(accepted[0].title).toBe('Accepted One');
    });
  });

  describe('show', () => {
    it('should return null for non-existent id', async () => {
      const result = await mgr.show(999);
      expect(result).toBeNull();
    });

    it('should return decision and content', async () => {
      await mgr.create('Use PostgreSQL', { context: 'Need relational DB' });
      const result = await mgr.show(1);
      expect(result).not.toBeNull();
      expect(result!.decision.title).toBe('Use PostgreSQL');
      expect(result!.content).toContain('Use PostgreSQL');
      expect(result!.content).toContain('Need relational DB');
    });
  });

  describe('update', () => {
    it('should return null for non-existent id', async () => {
      const result = await mgr.update(999, { status: 'accepted' });
      expect(result).toBeNull();
    });

    it('should update status', async () => {
      await mgr.create('Use REST');
      const updated = await mgr.update(1, { status: 'accepted' });
      expect(updated!.status).toBe('accepted');

      // Verify persisted
      const result = await mgr.show(1);
      expect(result!.decision.status).toBe('accepted');
    });

    it('should update content fields', async () => {
      await mgr.create('Use REST');
      await mgr.update(1, { context: 'Updated context', consequences: 'New consequences' });
      const result = await mgr.show(1);
      expect(result!.content).toContain('Updated context');
      expect(result!.content).toContain('New consequences');
    });
  });

  describe('supersede', () => {
    it('should return false for non-existent id', async () => {
      const ok = await mgr.supersede(999, 1);
      expect(ok).toBe(false);
    });

    it('should mark decision as superseded', async () => {
      await mgr.create('Old approach');
      await mgr.create('New approach');
      const ok = await mgr.supersede(1, 2);
      expect(ok).toBe(true);

      const result = await mgr.show(1);
      expect(result!.decision.status).toBe('superseded');
      expect(result!.decision.supersededBy).toBe(2);
    });
  });

  describe('getForGenerator', () => {
    it('should return empty string when no decisions', async () => {
      const content = await mgr.getForGenerator();
      expect(content).toBe('');
    });

    it('should include accepted decisions', async () => {
      await mgr.create('Use PostgreSQL', { status: 'accepted' });
      await mgr.create('Use REST', { status: 'accepted' });
      const content = await mgr.getForGenerator();
      expect(content).toContain('Decision Records');
      expect(content).toContain('Use PostgreSQL');
      expect(content).toContain('Use REST');
    });

    it('should exclude superseded decisions', async () => {
      await mgr.create('Old DB', { status: 'accepted' });
      await mgr.supersede(1, 2);
      await mgr.create('New DB', { status: 'accepted' });
      const content = await mgr.getForGenerator();
      expect(content).not.toContain('Old DB');
      expect(content).toContain('New DB');
    });
  });

  describe('getNextId', () => {
    it('should return 1 when no decisions exist', async () => {
      const id = await mgr.getNextId();
      expect(id).toBe(1);
    });

    it('should return max+1', async () => {
      await mgr.create('A');
      await mgr.create('B');
      await mgr.create('C');
      const id = await mgr.getNextId();
      expect(id).toBe(4);
    });
  });
});
