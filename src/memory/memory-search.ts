/**
 * Hybrid Search Engine with Reciprocal Rank Fusion (RRF)
 *
 * Combines BM25 keyword search (FTS5) with HNSW vector search
 * using RRF scoring for hybrid results.
 */

import type { MemoryStore } from './memory-store.js';
import type { HNSWIndex } from './hnsw-index.js';
import type {
  MemorySearchResult,
  MemorySearchOptions,
  MemoryType,
  TimelineEntry,
  Memory,
} from './memory-types.js';
import { vectorize } from './memory-vectorizer.js';

const RRF_K = 60; // RRF smoothing constant

export class MemorySearch {
  constructor(
    private store: MemoryStore,
    private index: HNSWIndex,
    private dimensions: number = 256
  ) {}

  /**
   * Search memories using the specified mode
   */
  search(options: MemorySearchOptions): MemorySearchResult[] {
    const mode = options.mode ?? 'hybrid';
    const limit = options.limit ?? 20;

    switch (mode) {
      case 'bm25':
        return this.searchBM25(options.query, limit, options.type);
      case 'vector':
        return this.searchVector(options.query, limit, options.type);
      case 'hybrid':
      default:
        return this.searchHybrid(options.query, limit, options.type);
    }
  }

  /**
   * BM25 keyword search via FTS5
   */
  private searchBM25(
    query: string,
    limit: number,
    type?: MemoryType
  ): MemorySearchResult[] {
    const results = this.store.searchBM25(query, limit, { type });
    return results.map((r) => {
      const memory = this.store.getMemory(r.id);
      return {
        id: r.id,
        title: memory?.title ?? '',
        type: (memory?.type ?? 'observation') as MemoryType,
        score: r.score,
        matchType: 'bm25' as const,
        createdAt: memory?.createdAt ?? 0,
      };
    });
  }

  /**
   * Vector similarity search via HNSW
   */
  private searchVector(
    query: string,
    limit: number,
    type?: MemoryType
  ): MemorySearchResult[] {
    if (this.index.size === 0) return [];

    const queryVector = vectorize(query, this.dimensions);
    const candidates = this.index.search(queryVector, limit * 2); // fetch extra for filtering

    const results: MemorySearchResult[] = [];
    for (const candidate of candidates) {
      const memory = this.store.getMemory(candidate.label);
      if (!memory) continue;
      if (type && memory.type !== type) continue;

      results.push({
        id: memory.id,
        title: memory.title,
        type: memory.type,
        score: 1 - candidate.distance, // convert distance to similarity
        matchType: 'vector',
        createdAt: memory.createdAt,
      });

      if (results.length >= limit) break;
    }

    return results;
  }

  /**
   * Hybrid search: BM25 + HNSW merged with Reciprocal Rank Fusion
   *
   * RRF formula: score(d) = 1/(k + rank_bm25(d)) + 1/(k + rank_hnsw(d))
   */
  private searchHybrid(
    query: string,
    limit: number,
    type?: MemoryType
  ): MemorySearchResult[] {
    const bm25Results = this.searchBM25(query, limit * 2, type);
    const vectorResults = this.searchVector(query, limit * 2, type);

    // Build rank maps
    const bm25Rank = new Map<string, number>();
    bm25Results.forEach((r, i) => bm25Rank.set(r.id, i + 1));

    const vectorRank = new Map<string, number>();
    vectorResults.forEach((r, i) => vectorRank.set(r.id, i + 1));

    // Collect all unique IDs
    const allIds = new Set([
      ...bm25Results.map((r) => r.id),
      ...vectorResults.map((r) => r.id),
    ]);

    // Compute RRF scores
    const scored: Array<{
      id: string;
      score: number;
      matchType: 'bm25' | 'vector' | 'both';
    }> = [];

    for (const id of allIds) {
      const bRank = bm25Rank.get(id);
      const vRank = vectorRank.get(id);

      let score = 0;
      if (bRank) score += 1 / (RRF_K + bRank);
      if (vRank) score += 1 / (RRF_K + vRank);

      const matchType: 'bm25' | 'vector' | 'both' =
        bRank && vRank ? 'both' : bRank ? 'bm25' : 'vector';

      scored.push({ id, score, matchType });
    }

    // Sort by RRF score descending
    scored.sort((a, b) => b.score - a.score);

    // Build results with metadata
    const results: MemorySearchResult[] = [];
    const memoryMap = new Map<string, MemorySearchResult>();
    for (const r of [...bm25Results, ...vectorResults]) {
      if (!memoryMap.has(r.id)) memoryMap.set(r.id, r);
    }

    for (const s of scored.slice(0, limit)) {
      const base = memoryMap.get(s.id);
      if (base) {
        results.push({
          ...base,
          score: s.score,
          matchType: s.matchType,
        });
      }
    }

    return results;
  }

  /**
   * Layer 2: Get timeline context around a memory
   */
  getTimeline(memoryId: string, window: number = 5): TimelineEntry[] {
    const rows = this.store.getTimelineAround(memoryId, window);

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type as MemoryType,
      createdAt: row.createdAt,
      position:
        row.id === memoryId
          ? ('anchor' as const)
          : row.createdAt <=
            (rows.find((r) => r.id === memoryId)?.createdAt ?? 0)
          ? ('before' as const)
          : ('after' as const),
      distanceFromAnchor: Math.abs(
        row.createdAt -
          (rows.find((r) => r.id === memoryId)?.createdAt ?? 0)
      ),
    }));
  }

  /**
   * Layer 3: Get full details for specific memory IDs
   */
  getFullDetails(ids: string[]): Memory[] {
    const memories: Memory[] = [];
    for (const id of ids) {
      const memory = this.store.getMemory(id);
      if (memory) {
        this.store.updateAccessedAt(id);
        memories.push(memory);
      }
    }
    return memories;
  }
}
