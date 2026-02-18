/**
 * Cache Size Limiter with LRU Eviction
 *
 * Enforces configurable max database size (default 500MB)
 * using LRU-based eviction to protect the SSD.
 */

import type { MemoryStore } from './memory-store.js';
import type { HNSWIndex } from './hnsw-index.js';

const DEFAULT_MAX_SIZE = 524288000; // 500MB
const EVICTION_BATCH_SIZE = 100;
const TARGET_USAGE = 0.85; // 85% — evict until 15% headroom

export interface EvictionResult {
  evictedCount: number;
  freedBytes: number;
}

export class MemoryCache {
  private maxSizeBytes: number;

  constructor(
    private store: MemoryStore,
    private index: HNSWIndex,
    maxSizeBytes?: number
  ) {
    this.maxSizeBytes = maxSizeBytes ?? DEFAULT_MAX_SIZE;
  }

  getCurrentSize(): number {
    return this.store.getDbSizeBytes();
  }

  getUsagePercent(): number {
    return (this.getCurrentSize() / this.maxSizeBytes) * 100;
  }

  isOverLimit(): boolean {
    return this.getCurrentSize() > this.maxSizeBytes;
  }

  /**
   * Check and evict if over limit
   * Returns number of evicted memories and freed bytes
   */
  checkAndEvict(activeSessionId?: string): EvictionResult {
    if (!this.isOverLimit()) {
      return { evictedCount: 0, freedBytes: 0 };
    }

    return this.evict(activeSessionId);
  }

  /**
   * Force eviction regardless of current size.
   * Evicts at least one batch of candidates.
   */
  forceEvict(activeSessionId?: string): EvictionResult {
    const sizeBefore = this.getCurrentSize();
    let evictedCount = 0;

    // Always run at least one batch
    const candidates = this.store.getEvictionCandidates(
      EVICTION_BATCH_SIZE,
      activeSessionId
    );

    for (const candidate of candidates) {
      this.store.deleteMemory(candidate.id);
      this.index.remove(candidate.id);
      evictedCount++;
    }

    // If still over target, keep evicting
    const targetSize = this.maxSizeBytes * TARGET_USAGE;
    while (this.getCurrentSize() > targetSize) {
      const moreCandidates = this.store.getEvictionCandidates(
        EVICTION_BATCH_SIZE,
        activeSessionId
      );
      if (moreCandidates.length === 0) break;

      for (const candidate of moreCandidates) {
        this.store.deleteMemory(candidate.id);
        this.index.remove(candidate.id);
        evictedCount++;
      }
    }

    const freedBytes = sizeBefore - this.getCurrentSize();
    return { evictedCount, freedBytes: Math.max(0, freedBytes) };
  }

  private evict(activeSessionId?: string): EvictionResult {
    const sizeBefore = this.getCurrentSize();
    const targetSize = this.maxSizeBytes * TARGET_USAGE;
    let evictedCount = 0;

    while (this.getCurrentSize() > targetSize) {
      const candidates = this.store.getEvictionCandidates(
        EVICTION_BATCH_SIZE,
        activeSessionId
      );

      if (candidates.length === 0) break;

      for (const candidate of candidates) {
        this.store.deleteMemory(candidate.id);
        this.index.remove(candidate.id);
        evictedCount++;
      }
    }

    const freedBytes = sizeBefore - this.getCurrentSize();
    return { evictedCount, freedBytes: Math.max(0, freedBytes) };
  }
}
