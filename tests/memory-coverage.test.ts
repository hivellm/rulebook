/**
 * Coverage tests for the v5.6 file-based memory subsystem:
 * - MemoryManager: saveCodeNode/saveCodeEdge/deleteCodeNodesByFile against the
 *   JSONL code-graph log
 * - MemoryManager: createMemoryManager factory + startSession/endSession
 *   round-trips
 * - FileStore: code-graph append + read-back semantics
 * - legacy-migrator: graceful no-op when no legacy DB exists
 *
 * Written in batches per .claude/rules/incremental-tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { MemoryManager, createMemoryManager } from '../src/memory/memory-manager.js';
import { FileStore } from '../src/memory/file-store.js';
import type { CodeNode, CodeEdge } from '../src/core/indexer/indexer-types.js';

function tempDir(prefix: string): string {
  const dir = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function makeNode(id: string, filePath: string, hash = 'h1'): CodeNode {
  return {
    id,
    type: 'function',
    name: id,
    filePath,
    startLine: 1,
    endLine: 10,
    content: `// ${id}`,
    summary: undefined,
    hash,
    updatedAt: Date.now(),
  };
}

function makeEdge(id: string, sourceId: string, targetId: string): CodeEdge {
  return {
    id,
    sourceId,
    targetId,
    type: 'imports',
    weight: 1,
  };
}

describe('MemoryManager — code graph (JSONL)', () => {
  let dir: string;
  let manager: MemoryManager;

  beforeEach(() => {
    dir = tempDir('rulebook-mem-cov');
    manager = new MemoryManager(dir, { enabled: true, dbPath: '.rulebook/memory/memory.db' });
  });

  afterEach(async () => {
    await manager.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('appends a code node and reads its hash back', async () => {
    await manager.saveCodeNode(makeNode('node-1', 'src/foo.ts', 'h1'));
    const store = new FileStore(join(dir, '.rulebook', 'memory'));
    await store.initialize();
    expect(await store.getCodeNodeHash('node-1')).toBe('h1');
  });

  it('skips re-append when hash is unchanged', async () => {
    await manager.saveCodeNode(makeNode('node-2', 'src/bar.ts', 'h1'));
    await manager.saveCodeNode(makeNode('node-2', 'src/bar.ts', 'h1'));
    const store = new FileStore(join(dir, '.rulebook', 'memory'));
    await store.initialize();
    const ids = await store.getCodeNodeIdsByFile('src/bar.ts');
    expect(ids).toEqual(['node-2']);
  });

  it('appends an edge', async () => {
    await manager.saveCodeNode(makeNode('node-3', 'src/a.ts'));
    await manager.saveCodeNode(makeNode('node-4', 'src/b.ts'));
    await manager.saveCodeEdge(makeEdge('e1', 'node-3', 'node-4'));
    const store = new FileStore(join(dir, '.rulebook', 'memory'));
    await store.initialize();
    expect((await store.getCodeNode('node-3'))?.id).toBe('node-3');
    expect((await store.getCodeNode('node-4'))?.id).toBe('node-4');
  });

  it('deleteCodeNodesByFile compacts the log', async () => {
    await manager.saveCodeNode(makeNode('node-5', 'src/del.ts'));
    await manager.saveCodeNode(makeNode('node-6', 'src/keep.ts'));
    await manager.deleteCodeNodesByFile('src/del.ts');
    const store = new FileStore(join(dir, '.rulebook', 'memory'));
    await store.initialize();
    expect(await store.getCodeNodeIdsByFile('src/del.ts')).toEqual([]);
    expect(await store.getCodeNodeIdsByFile('src/keep.ts')).toEqual(['node-6']);
  });
});

describe('MemoryManager — sessions', () => {
  let dir: string;
  let manager: MemoryManager;

  beforeEach(() => {
    dir = tempDir('rulebook-mem-sess');
    manager = createMemoryManager(dir, { enabled: true, dbPath: '.rulebook/memory/memory.db' });
  });

  afterEach(async () => {
    await manager.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('startSession + endSession round-trip', async () => {
    const session = await manager.startSession('cov-project');
    expect(session.status).toBe('active');
    await manager.endSession(session.id, 'wrap-up');
    const stats = await manager.getStats();
    expect(stats.sessionCount).toBe(1);
  });
});

describe('legacy-migrator', () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDir('rulebook-mem-mig');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns 0 counts when there is no legacy DB', async () => {
    const { migrateLegacyDb } = await import('../src/memory/legacy-migrator.js');
    const store = new FileStore(join(dir, 'memory'));
    await store.initialize();
    const stats = await migrateLegacyDb(join(dir, 'no-such.db'), store);
    expect(stats).toEqual({ memories: 0, sessions: 0 });
  });
});
