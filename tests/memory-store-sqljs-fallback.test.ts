import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Memory } from '../src/memory/memory-types.js';

/**
 * Tests the sql.js fallback by mocking better-sqlite3 to fail.
 * This simulates environments without native build tools.
 */
describe('MemoryStore — sql.js fallback', () => {
  let testDir: string;
  let dbPath: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `rulebook-sqljs-fallback-test-${Date.now()}`);
    mkdirSync(join(testDir, 'memory'), { recursive: true });
    dbPath = join(testDir, 'memory', 'test.db');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should fall back to sql.js when better-sqlite3 import fails', async () => {
    // Mock better-sqlite3 to throw (simulating missing native addon)
    vi.mock('better-sqlite3', () => {
      throw new Error('Cannot find module better-sqlite3');
    });

    // Dynamic import to get the module after mocking
    const { MemoryStore } = await import('../src/memory/memory-store.js');
    const store = new MemoryStore(dbPath);
    await store.initialize();

    // Should work with sql.js fallback
    store.saveMemory(makeMemory('m1', 'Fallback test', 'Content via sql.js'));

    const mem = store.getMemory('m1');
    expect(mem).not.toBeNull();
    expect(mem!.title).toBe('Fallback test');
    expect(mem!.content).toBe('Content via sql.js');

    expect(store.getMemoryCount()).toBe(1);

    // Persistence — force save then check file
    store.saveToDisk();
    expect(existsSync(dbPath)).toBe(true);

    store.close();
  });
});

function makeMemory(id: string, title: string, content = 'Test'): Memory {
  const now = Date.now();
  return {
    id,
    type: 'observation',
    title,
    content,
    project: 'test',
    tags: ['test'],
    createdAt: now,
    updatedAt: now,
    accessedAt: now,
  };
}
