/**
 * Memory System Type Definitions
 *
 * Core types for the persistent memory system with BM25 + HNSW hybrid search.
 */

export type MemoryType =
  | 'bugfix'
  | 'feature'
  | 'refactor'
  | 'decision'
  | 'discovery'
  | 'change'
  | 'observation';

export type SearchMode = 'bm25' | 'vector' | 'hybrid';

export interface Memory {
  id: string;
  type: MemoryType;
  title: string;
  summary?: string; // Rich contextual summary for better search relevance
  content: string;
  project: string;
  tags: string[];
  sessionId?: string;
  createdAt: number; // epoch ms
  updatedAt: number;
  accessedAt: number;
}

export interface MemorySession {
  id: string;
  project: string;
  status: 'active' | 'completed';
  startedAt: number;
  endedAt?: number;
  summary?: string;
  toolCalls: number;
}

export interface MemorySearchResult {
  id: string;
  title: string;
  type: MemoryType;
  score: number;
  matchType: 'bm25' | 'vector' | 'both';
  createdAt: number;
}

export interface MemorySearchOptions {
  query: string;
  mode?: SearchMode;
  type?: MemoryType;
  limit?: number;
  project?: string;
}

export interface MemoryConfig {
  enabled?: boolean;
  dbPath?: string; // default: '.rulebook/memory/memory.db'
  maxSizeBytes?: number; // default: 524288000 (500MB)
  autoCapture?: boolean; // default: false
  vectorDimensions?: number; // default: 256
}

export interface MemoryStats {
  dbSizeBytes: number;
  memoryCount: number;
  sessionCount: number;
  oldestMemory?: number;
  newestMemory?: number;
  maxSizeBytes: number;
  usagePercent: number;
  indexHealth: 'good' | 'degraded' | 'needs-rebuild';
}

export interface TimelineEntry {
  id: string;
  title: string;
  type: MemoryType;
  createdAt: number;
  position: 'before' | 'anchor' | 'after';
  distanceFromAnchor: number;
}
