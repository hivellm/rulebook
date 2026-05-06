import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { MemoryManager } from '../src/memory/memory-manager.js';

describe('MemoryManager', () => {
  let testDir: string;
  let manager: MemoryManager;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-mgr-'));
    manager = new MemoryManager(testDir, {
      enabled: true,
      dbPath: '.rulebook-memory/memory.db',
    });
  });

  afterEach(async () => {
    await manager.close();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('lazy initialization', () => {
    it('should not create DB until first operation', async () => {
      const dbPath = path.join(testDir, '.rulebook-memory', 'memory.db');
      const exists = await fs
        .access(dbPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    it('should initialize on first save and write a markdown file under memories/', async () => {
      const saved = await manager.saveMemory({
        type: 'observation',
        title: 'Test',
        content: 'First memory',
      });

      const memoriesDir = path.join(testDir, '.rulebook-memory', 'memories');
      const exists = await fs
        .access(memoriesDir)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      // The saved file should be readable back via the manager
      const loaded = await manager.getMemory(saved.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.title).toBe('Test');
    });
  });

  describe('CRUD lifecycle', () => {
    it('should save and retrieve a memory', async () => {
      const saved = await manager.saveMemory({
        type: 'bugfix',
        title: 'Auth bug fix',
        content: 'Fixed login failure',
        tags: ['auth', 'bug'],
      });

      expect(saved.id).toBeDefined();
      expect(saved.type).toBe('bugfix');

      const loaded = await manager.getMemory(saved.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.title).toBe('Auth bug fix');
      expect(loaded!.tags).toEqual(['auth', 'bug']);
    });

    it('should delete a memory', async () => {
      const saved = await manager.saveMemory({
        type: 'observation',
        title: 'To be deleted',
        content: 'Temporary',
      });

      await manager.deleteMemory(saved.id);
      const loaded = await manager.getMemory(saved.id);
      expect(loaded).toBeNull();
    });

    it('should return null for non-existent memory', async () => {
      const loaded = await manager.getMemory('nonexistent');
      expect(loaded).toBeNull();
    });
  });

  describe('search', () => {
    it('should find memories by search', async () => {
      await manager.saveMemory({
        type: 'bugfix',
        title: 'Fix authentication bug',
        content: 'Fixed login failure caused by expired tokens in auth module',
      });
      await manager.saveMemory({
        type: 'feature',
        title: 'Add database migration',
        content: 'Created user table schema migration script',
      });

      const results = await manager.searchMemories({
        query: 'authentication login',
      });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('privacy filter', () => {
    it('should strip private tags from content', async () => {
      const saved = await manager.saveMemory({
        type: 'observation',
        title: 'Config note',
        content: 'The API key is <private>sk-12345secret</private> stored in env',
      });

      const loaded = await manager.getMemory(saved.id);
      expect(loaded!.content).not.toContain('sk-12345secret');
      expect(loaded!.content).toContain('[REDACTED]');
    });

    it('should handle multiple private tags', async () => {
      const saved = await manager.saveMemory({
        type: 'observation',
        title: 'Secrets',
        content: 'Key: <private>key1</private> and token: <private>token2</private>',
      });

      const loaded = await manager.getMemory(saved.id);
      expect(loaded!.content).not.toContain('key1');
      expect(loaded!.content).not.toContain('token2');
      expect(loaded!.content).toContain('[REDACTED]');
    });
  });

  describe('sessions', () => {
    it('should start and end a session', async () => {
      const session = await manager.startSession('test-project');
      expect(session.id).toBeDefined();
      expect(session.status).toBe('active');

      await manager.endSession(session.id, 'Completed work');
    });
  });

  describe('stats', () => {
    it('should return stats', async () => {
      await manager.saveMemory({
        type: 'observation',
        title: 'Test',
        content: 'Content',
      });

      const stats = await manager.getStats();
      expect(stats.memoryCount).toBe(1);
      expect(stats.dbSizeBytes).toBeGreaterThan(0);
      expect(stats.maxSizeBytes).toBe(524288000);
      expect(stats.usagePercent).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should not evict when under limit', async () => {
      await manager.saveMemory({
        type: 'observation',
        title: 'Test',
        content: 'Content',
      });

      const result = await manager.cleanup(false);
      expect(result.evictedCount).toBe(0);
    });

    it('age-based cleanup evicts memories older than maxAgeDays', async () => {
      // Save five memories then back-date them to 60 days ago by writing a
      // copy with a stale createdAt via the file store directly.
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        const m = await manager.saveMemory({
          type: 'observation',
          title: `Memory ${i}`,
          content: `Content for memory ${i}`,
        });
        ids.push(m.id);
      }

      // Back-date all memories on disk via the FileStore, then close the
      // manager so its internal cache is refreshed on the next use.
      const { FileStore } = await import('../src/memory/file-store.js');
      const store = new FileStore(path.join(testDir, '.rulebook-memory'));
      await store.initialize();
      const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
      for (const id of ids) {
        const mem = await store.getMemory(id);
        if (!mem) continue;
        mem.createdAt = sixtyDaysAgo;
        await store.saveMemory(mem);
      }

      await manager.close();
      manager = new MemoryManager(testDir, {
        enabled: true,
        dbPath: '.rulebook-memory/memory.db',
      });

      const result = await manager.cleanup({ maxAgeDays: 30 });
      expect(result.evictedCount).toBe(5);
    });
  });

  describe('export', () => {
    it('should export as JSON', async () => {
      await manager.saveMemory({
        type: 'bugfix',
        title: 'Bug fix',
        content: 'Fixed something',
      });

      const json = await manager.exportMemories('json');
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe('Bug fix');
    });

    it('should export as CSV', async () => {
      await manager.saveMemory({
        type: 'feature',
        title: 'New feature',
        content: 'Added something',
      });

      const csv = await manager.exportMemories('csv');
      expect(csv).toContain('id,type,title');
      expect(csv).toContain('New feature');
    });
  });
});
