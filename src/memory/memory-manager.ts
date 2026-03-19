/**
 * Memory Manager - Main Orchestrator
 *
 * Public API that ties all sub-components together:
 * MemoryStore, MemoryVectorizer, HNSWIndex, MemorySearch, MemoryCache.
 * Uses lazy initialization to avoid loading WASM until first use.
 */

import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { HNSWIndex } from './hnsw-index.js';
import { MemoryCache } from './memory-cache.js';
import { MemorySearch } from './memory-search.js';
import { MemoryStore } from './memory-store.js';
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
import { vectorize } from './memory-vectorizer.js';

const DEFAULT_DB_PATH = '.rulebook/memory/memory.db';
const DEFAULT_HNSW_PATH = '.rulebook/memory/vectors.hnsw';
const DEFAULT_MAX_SIZE = 524288000; // 500MB
const DEFAULT_DIMENSIONS = 256;
const HNSW_SAVE_THRESHOLD = 100;

const PRIVATE_TAG_REGEX = /<private>[\s\S]*?<\/private>/g;

export class MemoryManager {
  private store: MemoryStore | null = null;
  private index: HNSWIndex | null = null;
  private search: MemorySearch | null = null;
  private cache: MemoryCache | null = null;
  private initialized = false;
  private hnswInsertCount = 0;

  private readonly dbPath: string;
  private readonly hnswPath: string;
  private readonly maxSizeBytes: number;
  private readonly dimensions: number;
  private saveCount = 0;
  private static readonly EVICTION_CHECK_INTERVAL = 50;

  constructor(projectRoot: string, config: MemoryConfig) {
    this.dbPath = join(projectRoot, config.dbPath ?? DEFAULT_DB_PATH);
    this.hnswPath = join(
      projectRoot,
      config.dbPath ? config.dbPath.replace(/\.db$/, '.hnsw') : DEFAULT_HNSW_PATH
    );
    this.maxSizeBytes = config.maxSizeBytes ?? DEFAULT_MAX_SIZE;
    this.dimensions = config.vectorDimensions ?? DEFAULT_DIMENSIONS;
  }

  private initPromise: Promise<void> | null = null;

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    // Deduplicate concurrent init calls (e.g. multiple tool calls hitting memory at once)
    if (!this.initPromise) {
      this.initPromise = this.doInit().catch((err) => {
        // Reset so next call retries instead of getting stuck on a rejected promise
        this.initPromise = null;
        throw err;
      });
    }
    await this.initPromise;
  }

  private async doInit(): Promise<void> {
    const INIT_TIMEOUT_MS = parseInt(process.env.RULEBOOK_MEMORY_INIT_TIMEOUT_MS ?? '8000', 10);

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Memory initialization timed out after ${INIT_TIMEOUT_MS}ms`)),
        INIT_TIMEOUT_MS
      )
    );

    await Promise.race([this.doInitInner(), timeout]);
  }

  private async doInitInner(): Promise<void> {
    // Initialize store (loads WASM sql.js — can be slow on first load)
    this.store = new MemoryStore(this.dbPath);
    await this.store.initialize();

    // Initialize HNSW index
    if (existsSync(this.hnswPath)) {
      try {
        const data = readFileSync(this.hnswPath);
        this.index = HNSWIndex.deserialize(
          data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
        );
      } catch {
        this.index = new HNSWIndex({ dimensions: this.dimensions });
      }
    } else {
      this.index = new HNSWIndex({ dimensions: this.dimensions });
    }

    // Initialize search and cache
    this.search = new MemorySearch(this.store, this.index, this.dimensions);
    this.cache = new MemoryCache(this.store, this.index, this.maxSizeBytes);

    this.initialized = true;
  }

  /**
   * Strip <private>...</private> tags from content before storing
   */
  private filterPrivate(content: string): string {
    return content.replace(PRIVATE_TAG_REGEX, '[REDACTED]');
  }

  private saveHnswIfNeeded(): void {
    this.hnswInsertCount++;
    if (this.hnswInsertCount >= HNSW_SAVE_THRESHOLD) {
      this.saveHnswToDisk();
      this.hnswInsertCount = 0;
    }
  }

  private saveHnswToDisk(): void {
    if (!this.index || this.index.size === 0) return;

    const dir = join(this.hnswPath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const buffer = this.index.serialize();
    writeFileSync(this.hnswPath, Buffer.from(buffer));
  }

  // --- Public API ---

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

    this.store!.saveMemory(memory);

    // Vectorize using title + summary (if available) + content for better semantic relevance
    const textToVectorize = [memory.title, memory.summary || memory.content.substring(0, 300)]
      .filter(Boolean)
      .join(' ');
    const vec = vectorize(textToVectorize, this.dimensions);
    this.index!.add(memory.id, vec);
    this.saveHnswIfNeeded();

    // Check cache limits periodically (not on every save — getDbSizeBytes is cheap now
    // but eviction itself is expensive and rarely needed)
    this.saveCount++;
    if (this.saveCount >= MemoryManager.EVICTION_CHECK_INTERVAL) {
      this.saveCount = 0;
      this.cache!.checkAndEvict();
    }

    return memory;
  }

  async getMemory(id: string): Promise<Memory | null> {
    await this.ensureInitialized();
    const memory = this.store!.getMemory(id);
    if (memory) {
      this.store!.updateAccessedAt(id);
    }
    return memory;
  }

  async deleteMemory(id: string): Promise<void> {
    await this.ensureInitialized();
    this.store!.deleteMemory(id);
    this.index!.remove(id);
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

    this.store!.createSession(session);
    return session;
  }

  async endSession(sessionId: string, summary?: string): Promise<void> {
    await this.ensureInitialized();
    this.store!.endSession(sessionId, summary);
  }

  async getStats(): Promise<MemoryStats> {
    await this.ensureInitialized();

    const dbSize = this.store!.getDbSizeBytes();
    const memoryCount = this.store!.getMemoryCount();
    const sessionCount = this.store!.getSessionCount();

    return {
      dbSizeBytes: dbSize,
      memoryCount,
      sessionCount,
      oldestMemory: this.store!.getOldestMemoryTimestamp(),
      newestMemory: this.store!.getNewestMemoryTimestamp(),
      maxSizeBytes: this.maxSizeBytes,
      usagePercent: (dbSize / this.maxSizeBytes) * 100,
      indexHealth:
        this.index!.size === memoryCount
          ? 'good'
          : Math.abs(this.index!.size - memoryCount) < memoryCount * 0.1
            ? 'degraded'
            : 'needs-rebuild',
    };
  }

  async cleanup(force: boolean = false): Promise<{ evictedCount: number; freedBytes: number }> {
    await this.ensureInitialized();

    if (force) {
      return this.cache!.forceEvict();
    }
    return this.cache!.checkAndEvict();
  }

  async exportMemories(format: 'json' | 'csv' = 'json'): Promise<string> {
    await this.ensureInitialized();

    const memories = this.store!.listMemories({ limit: 1000 });

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

  // --- Background Indexer Graph Persistence ---

  async saveCodeNode(node: import('../core/indexer/indexer-types.js').CodeNode): Promise<void> {
    await this.ensureInitialized();

    // Check if hash is exactly the same to avoid re-vectorizing unchanged chunks
    const existingHash = this.store!.getCodeNodeByHash(node.id);
    if (existingHash === node.hash) {
      return; // Unchanged
    }

    this.store!.saveCodeNode(node);

    // Vectorize code chunks for FTS/HNSW semantic search
    const textToVectorize = [node.name, node.summary || '', node.content].filter(Boolean).join(' ');
    // Important: We prepend an identifier so search knows it's a code node
    const vecId = `__code__${node.id}`;
    const vec = vectorize(textToVectorize, this.dimensions);
    this.index!.add(vecId, vec);
    this.saveHnswIfNeeded();
  }

  async saveCodeEdge(edge: import('../core/indexer/indexer-types.js').CodeEdge): Promise<void> {
    await this.ensureInitialized();
    this.store!.saveCodeEdge(edge);
  }

  async deleteCodeNodesByFile(filePath: string): Promise<void> {
    await this.ensureInitialized();
    // Query node IDs before deleting from SQLite so we can also clean HNSW
    const nodeIds = this.store!.getCodeNodeIdsByFile(filePath);
    this.store!.deleteCodeNodesByFile(filePath);
    // Remove corresponding vectors from HNSW to prevent orphan accumulation
    for (const id of nodeIds) {
      this.index!.remove(`__code__${id}`);
    }
  }

  async close(): Promise<void> {
    if (this.store) {
      this.store.close();
    }
    this.saveHnswToDisk();
    this.initialized = false;
    this.store = null;
    this.index = null;
    this.search = null;
    this.cache = null;
  }
}

/**
 * Factory function
 */
export function createMemoryManager(projectRoot: string, config: MemoryConfig): MemoryManager {
  return new MemoryManager(projectRoot, config);
}
