/**
 * Memory Manager - Main Orchestrator
 *
 * Public API that ties all sub-components together:
 * MemoryStore, MemoryVectorizer, HNSWIndex, MemorySearch, MemoryCache.
 * Uses lazy initialization to avoid loading WASM until first use.
 */

import { join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import type {
  Memory,
  MemorySession,
  MemorySearchResult,
  MemorySearchOptions,
  MemoryConfig,
  MemoryStats,
  MemoryType,
  TimelineEntry,
} from './memory-types.js';
import { MemoryStore } from './memory-store.js';
import { HNSWIndex } from './hnsw-index.js';
import { MemorySearch } from './memory-search.js';
import { MemoryCache } from './memory-cache.js';
import { vectorize } from './memory-vectorizer.js';

const DEFAULT_DB_PATH = '.rulebook-memory/memory.db';
const DEFAULT_HNSW_PATH = '.rulebook-memory/vectors.hnsw';
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

  constructor(
    projectRoot: string,
    config: MemoryConfig
  ) {
    this.dbPath = join(
      projectRoot,
      config.dbPath ?? DEFAULT_DB_PATH
    );
    this.hnswPath = join(
      projectRoot,
      config.dbPath
        ? config.dbPath.replace(/\.db$/, '.hnsw')
        : DEFAULT_HNSW_PATH
    );
    this.maxSizeBytes = config.maxSizeBytes ?? DEFAULT_MAX_SIZE;
    this.dimensions = config.vectorDimensions ?? DEFAULT_DIMENSIONS;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    // Initialize store
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
      content: this.filterPrivate(input.content),
      project: input.project ?? '',
      tags: input.tags ?? [],
      sessionId: input.sessionId,
      createdAt: now,
      updatedAt: now,
      accessedAt: now,
    };

    this.store!.saveMemory(memory);

    // Vectorize and add to HNSW
    const vec = vectorize(`${memory.title} ${memory.content}`, this.dimensions);
    this.index!.add(memory.id, vec);
    this.saveHnswIfNeeded();

    // Check cache limits
    this.cache!.checkAndEvict();

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

    const memories = this.store!.listMemories({ limit: 100000 });

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
export function createMemoryManager(
  projectRoot: string,
  config: MemoryConfig
): MemoryManager {
  return new MemoryManager(projectRoot, config);
}
