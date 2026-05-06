/**
 * Memory Manager - File-backed orchestrator (v5.6).
 *
 * Public API kept stable for callers (saveMemory, searchMemories,
 * getTimeline, getFullDetails, startSession, endSession, getStats,
 * cleanup, exportMemories, plus the indexer code-graph methods).
 *
 * Internally uses the FileStore + FileSearch implementations under
 * `.rulebook/memory/{memories,sessions,codegraph}/...` instead of
 * SQLite + HNSW. On startup, an existing legacy `memory.db` is
 * auto-detected and migrated to markdown one time, then renamed to
 * `memory.db.legacy`.
 */

import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { rename } from 'fs/promises';
import { join, dirname } from 'path';
import { FileStore } from './file-store.js';
import { FileSearch } from './file-search.js';
import type {
  Memory,
  MemoryConfig,
  MemorySearchOptions,
  MemorySearchResult,
  MemorySession,
  MemoryStats,
  MemoryType,
  TimelineEntry,
} from './memory-types.js';
import type { CodeNode, CodeEdge } from '../core/indexer/indexer-types.js';

const DEFAULT_DB_PATH = '.rulebook/memory/memory.db';
const DEFAULT_MAX_SIZE = 524288000; // 500MB — kept for getStats compatibility

const PRIVATE_TAG_REGEX = /<private>[\s\S]*?<\/private>/g;

export class MemoryManager {
  private store: FileStore | null = null;
  private search: FileSearch | null = null;
  private initialized = false;
  private migrated = false;

  /** Resolved root for the file-based store (sibling of legacy `memory.db`). */
  private readonly memoryRoot: string;
  /** Path to the legacy DB file, used for one-shot migration on first init. */
  private readonly legacyDbPath: string;
  private readonly maxSizeBytes: number;

  constructor(projectRoot: string, config: MemoryConfig) {
    const dbRel = config.dbPath ?? DEFAULT_DB_PATH;
    const dbAbs = join(projectRoot, dbRel);
    this.legacyDbPath = dbAbs;
    this.memoryRoot = dirname(dbAbs);
    this.maxSizeBytes = config.maxSizeBytes ?? DEFAULT_MAX_SIZE;
  }

  private initPromise: Promise<void> | null = null;

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = this.doInit().catch((err) => {
        this.initPromise = null;
        throw err;
      });
    }
    await this.initPromise;
  }

  private async doInit(): Promise<void> {
    this.store = new FileStore(this.memoryRoot);
    await this.store.initialize();
    this.search = new FileSearch(this.store);

    // One-shot legacy DB migration. The runtime never reads SQLite again.
    if (!this.migrated && existsSync(this.legacyDbPath)) {
      try {
        const { migrateLegacyDb } = await import('./legacy-migrator.js');
        await migrateLegacyDb(this.legacyDbPath, this.store);
        await rename(this.legacyDbPath, this.legacyDbPath + '.legacy');
        this.store.invalidateCaches();
      } catch (err) {
        // Non-fatal: surface but keep the manager functional.
        console.error(
          '[MemoryManager] legacy DB migration failed; continuing with file-only store:',
          err instanceof Error ? err.message : String(err)
        );
      }
      this.migrated = true;
    }

    this.initialized = true;
  }

  private filterPrivate(content: string): string {
    return content.replace(PRIVATE_TAG_REGEX, '[REDACTED]');
  }

  // ── public API ─────────────────────────────────────────────────────

  async saveMemory(input: {
    type: MemoryType;
    title: string;
    summary?: string;
    content: string;
    tags?: string[];
    project?: string;
    sessionId?: string;
  }): Promise<Memory> {
    await this.ensureInitialized();
    const now = Date.now();
    const memory: Memory = {
      id: randomUUID(),
      type: input.type,
      title: input.title,
      summary: input.summary,
      content: this.filterPrivate(input.content),
      project: input.project ?? '',
      tags: input.tags ?? [],
      sessionId: input.sessionId,
      createdAt: now,
      updatedAt: now,
      accessedAt: now,
    };
    await this.store!.saveMemory(memory);
    // Refresh the inverted-index sidecar lazily for large corpora.
    try {
      await this.search!.maybeRebuildIndex();
    } catch {
      // non-fatal — search falls back to in-memory build per call
    }
    return memory;
  }

  async getMemory(id: string): Promise<Memory | null> {
    await this.ensureInitialized();
    const memory = await this.store!.getMemory(id);
    if (memory) await this.store!.updateAccessedAt(id);
    return memory;
  }

  async deleteMemory(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.store!.deleteMemory(id);
  }

  async searchMemories(options: MemorySearchOptions): Promise<MemorySearchResult[]> {
    await this.ensureInitialized();
    return this.search!.search(options);
  }

  async getTimeline(memoryId: string, window: number = 5): Promise<TimelineEntry[]> {
    await this.ensureInitialized();
    return this.search!.getTimeline(memoryId, window);
  }

  async getFullDetails(ids: string[]): Promise<Memory[]> {
    await this.ensureInitialized();
    return this.search!.getFullDetails(ids);
  }

  async startSession(project: string): Promise<MemorySession> {
    await this.ensureInitialized();
    const session: MemorySession = {
      id: randomUUID(),
      project,
      status: 'active',
      startedAt: Date.now(),
      toolCalls: 0,
    };
    await this.store!.saveSession(session);
    return session;
  }

  async endSession(sessionId: string, summary?: string): Promise<void> {
    await this.ensureInitialized();
    const existing = await this.store!.getSession(sessionId);
    if (!existing) return;
    existing.status = 'completed';
    existing.endedAt = Date.now();
    if (summary !== undefined) existing.summary = summary;
    await this.store!.saveSession(existing);
  }

  async getStats(): Promise<MemoryStats> {
    await this.ensureInitialized();
    const stats = await this.store!.getStats();
    return {
      dbSizeBytes: stats.totalBytes,
      memoryCount: stats.memoryCount,
      sessionCount: stats.sessionCount,
      fileCount: stats.fileCount,
      oldestMemory: stats.oldestMemory,
      newestMemory: stats.newestMemory,
      maxSizeBytes: this.maxSizeBytes,
      usagePercent: this.maxSizeBytes > 0 ? (stats.totalBytes / this.maxSizeBytes) * 100 : 0,
    };
  }

  /**
   * Age-based retention. With no `maxAgeDays` arg, this is a no-op (the
   * legacy LRU byte-budget eviction was removed in v5.6).
   */
  async cleanup(
    arg?: boolean | { maxAgeDays?: number }
  ): Promise<{ evictedCount: number; freedBytes: number }> {
    await this.ensureInitialized();
    const maxAgeDays = typeof arg === 'object' && arg !== null ? arg.maxAgeDays : undefined;
    if (maxAgeDays === undefined || maxAgeDays <= 0) {
      return { evictedCount: 0, freedBytes: 0 };
    }
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const all = await this.store!.listAllMemories();
    let evicted = 0;
    let freed = 0;
    const before = (await this.store!.getStats()).totalBytes;
    for (const m of all) {
      if (m.createdAt < cutoff) {
        await this.store!.deleteMemory(m.id);
        evicted++;
      }
    }
    const after = (await this.store!.getStats()).totalBytes;
    freed = Math.max(0, before - after);
    return { evictedCount: evicted, freedBytes: freed };
  }

  async exportMemories(format: 'json' | 'csv' = 'json'): Promise<string> {
    await this.ensureInitialized();
    const memories = await this.store!.listMemories({ limit: 10000 });
    if (format === 'csv') {
      const header = 'id,type,title,content,project,tags,createdAt,updatedAt';
      const rows = memories.map(
        (m) =>
          `"${m.id}","${m.type}","${m.title.replace(/"/g, '""')}","${m.content.replace(/"/g, '""')}","${m.project}","${m.tags.join(';')}",${m.createdAt},${m.updatedAt}`
      );
      return [header, ...rows].join('\n');
    }
    return JSON.stringify(memories, null, 2);
  }

  // ── background indexer code-graph (JSONL log) ─────────────────────

  async saveCodeNode(node: CodeNode): Promise<void> {
    await this.ensureInitialized();
    const existing = await this.store!.getCodeNodeHash(node.id);
    if (existing === node.hash) return;
    await this.store!.appendCodeNode(node);
  }

  async saveCodeEdge(edge: CodeEdge): Promise<void> {
    await this.ensureInitialized();
    await this.store!.appendCodeEdge(edge);
  }

  async deleteCodeNodesByFile(filePath: string): Promise<void> {
    await this.ensureInitialized();
    await this.store!.deleteCodeNodesByFile(filePath);
  }

  async close(): Promise<void> {
    this.initialized = false;
    this.store = null;
    this.search = null;
    this.initPromise = null;
  }
}

export function createMemoryManager(projectRoot: string, config: MemoryConfig): MemoryManager {
  return new MemoryManager(projectRoot, config);
}
