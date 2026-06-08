import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { FileStore } from '../src/memory/file-store.js';
import type { Memory } from '../src/memory/memory-types.js';

/**
 * Tests for v5.6 file-based memory persistence.
 *
 * Verifies that the layout under <root>/{memories,sessions,codegraph}/...
 * is created on initialize() and that single-write saves persist
 * immediately without any explicit close() / flush() step.
 */
describe('Memory Per-Project Persistence (file store)', () => {
    let testDir: string;

    function makeMemory(overrides: Partial<Memory> = {}): Memory {
        const now = Date.now();
        return {
            id: `mem-${Math.random().toString(36).slice(2)}`,
            type: 'observation',
            title: 'Test memory',
            content: 'Some content for testing',
            project: 'test-project',
            tags: ['test'],
            createdAt: now,
            updatedAt: now,
            accessedAt: now,
            ...overrides,
        };
    }

    beforeEach(async () => {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-mpp-'));
    });

    afterEach(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
    });

    describe('layout exists after initialize()', () => {
        it('creates memories/, sessions/, codegraph/ on initialize', async () => {
            const root = path.join(testDir, 'memory');
            const store = new FileStore(root);
            await store.initialize();
            expect(existsSync(path.join(root, 'memories'))).toBe(true);
            expect(existsSync(path.join(root, 'sessions'))).toBe(true);
            expect(existsSync(path.join(root, 'codegraph'))).toBe(true);
        });

        it('creates parent directories that do not exist yet', async () => {
            const root = path.join(testDir, 'deep', 'nested', 'dir');
            const store = new FileStore(root);
            await store.initialize();
            expect(existsSync(path.join(root, 'memories'))).toBe(true);
        });
    });

    describe('single write persistence', () => {
        it('persists a single saveMemory call immediately', async () => {
            const root = path.join(testDir, 'memory');
            const store = new FileStore(root);
            await store.initialize();

            const mem = makeMemory({ id: 'single-write-test', title: 'Single write' });
            await store.saveMemory(mem);

            // Reopen — no flush needed; the file is on disk already.
            const store2 = new FileStore(root);
            await store2.initialize();
            const loaded = await store2.getMemory('single-write-test');
            expect(loaded).not.toBeNull();
            expect(loaded!.title).toBe('Single write');
        });
    });

    describe('stats after writes', () => {
        it('reports correct memory count after saves', async () => {
            const root = path.join(testDir, 'memory');
            const store = new FileStore(root);
            await store.initialize();
            await store.saveMemory(makeMemory());
            await store.saveMemory(makeMemory());
            const stats = await store.getStats();
            expect(stats.memoryCount).toBe(2);
            expect(stats.fileCount).toBe(2);
            expect(stats.totalBytes).toBeGreaterThan(0);
        });
    });

    describe('reopen cycle', () => {
        it('survives close and reopen across sessions', async () => {
            const root = path.join(testDir, 'memory');

            const store1 = new FileStore(root);
            await store1.initialize();
            await store1.saveMemory(makeMemory({ id: 'persist-1', title: 'From session 1' }));

            const store2 = new FileStore(root);
            await store2.initialize();
            const loaded = await store2.getMemory('persist-1');
            expect(loaded).not.toBeNull();
            expect(loaded!.title).toBe('From session 1');
            await store2.saveMemory(makeMemory({ id: 'persist-2', title: 'From session 2' }));

            const store3 = new FileStore(root);
            await store3.initialize();
            expect(await store3.getMemory('persist-1')).not.toBeNull();
            expect(await store3.getMemory('persist-2')).not.toBeNull();
            const stats3 = await store3.getStats();
            expect(stats3.memoryCount).toBe(2);
        });
    });
});
