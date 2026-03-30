## 1. Core Types and Data Model
- [x] 1.1 Create `src/memory/memory-types.ts` with all interfaces (Memory, MemorySession, MemorySearchResult, MemorySearchOptions, MemoryConfig, MemoryStats, TimelineEntry)
- [x] 1.2 Add MemoryConfig to RulebookConfig in `src/types.ts`
- [x] 1.3 Add memory defaults to `src/core/config-manager.ts` (initialization + migration)

## 2. TF-IDF Vectorizer
- [x] 2.1 Create `src/memory/memory-vectorizer.ts` with feature hashing (FNV1a)
- [x] 2.2 Implement tokenization (lowercase, split, stop words removal)
- [x] 2.3 Implement TF-IDF weighting with L2 normalization
- [x] 2.4 Implement cosine similarity function
- [x] 2.5 Write tests `tests/memory-vectorizer.test.ts`

## 3. HNSW Vector Index
- [x] 3.1 Create `src/memory/hnsw-index.ts` with pure TypeScript HNSW implementation
- [x] 3.2 Implement multi-layer graph structure with navigable small world
- [x] 3.3 Implement add/search/remove operations with cosine distance
- [x] 3.4 Implement serialize/deserialize for disk persistence
- [x] 3.5 Write tests `tests/memory-hnsw-index.test.ts`

## 4. SQLite Storage Layer
- [x] 4.1 Add `sql.js` dependency to package.json
- [x] 4.2 Create `src/memory/memory-store.ts` with sql.js WASM initialization
- [x] 4.3 Implement schema creation (memories, sessions, memory_fts, vector_labels, vectorizer_meta)
- [x] 4.4 Implement FTS5 virtual table with BM25 ranking and sync triggers
- [x] 4.5 Implement CRUD operations for memories and sessions
- [x] 4.6 Implement BM25 search via FTS5 MATCH
- [x] 4.7 Implement auto-save to disk (every N writes + on close)
- [x] 4.8 Write tests `tests/memory-store.test.ts`

## 5. Hybrid Search Engine
- [x] 5.1 Create `src/memory/memory-search.ts` with Reciprocal Rank Fusion (RRF)
- [x] 5.2 Implement BM25-only, vector-only, and hybrid search modes
- [x] 5.3 Implement 3-layer search pattern (compact → timeline → full details)
- [x] 5.4 Implement timeline search (chronological context window)
- [x] 5.5 Write tests `tests/memory-search.test.ts`

## 6. Cache Size Limiter
- [x] 6.1 Create `src/memory/memory-cache.ts` with LRU eviction algorithm
- [x] 6.2 Implement size tracking (DB + HNSW index)
- [x] 6.3 Implement eviction with protected memory types (decisions, active sessions)
- [x] 6.4 Implement configurable max size with 15% headroom target
- [x] 6.5 Write tests `tests/memory-cache.test.ts`

## 7. Memory Manager (Orchestrator)
- [x] 7.1 Create `src/memory/memory-manager.ts` as public API
- [x] 7.2 Implement lazy initialization of all sub-components
- [x] 7.3 Implement CRUD operations (saveMemory, getMemory, deleteMemory)
- [x] 7.4 Implement search delegation (searchMemories, getTimeline)
- [x] 7.5 Implement session lifecycle (startSession, endSession)
- [x] 7.6 Implement privacy filter (strip `<private>` tags)
- [x] 7.7 Implement export (JSON/CSV)
- [x] 7.8 Write tests `tests/memory-manager.test.ts`

## 8. Agent Capture Hooks
- [x] 8.1 Create `src/memory/memory-hooks.ts` with auto-classification heuristics
- [x] 8.2 Implement captureFromClaudeCode adapter
- [x] 8.3 Implement captureFromCursor adapter
- [x] 8.4 Implement captureFromGemini adapter
- [x] 8.5 Modify `src/core/agent-manager.ts` to integrate memory capture

## 9. MCP Server Integration
- [x] 9.1 Add `rulebook_memory_search` MCP tool
- [x] 9.2 Add `rulebook_memory_timeline` MCP tool
- [x] 9.3 Add `rulebook_memory_get` MCP tool
- [x] 9.4 Add `rulebook_memory_save` MCP tool
- [x] 9.5 Add `rulebook_memory_stats` MCP tool
- [x] 9.6 Add `rulebook_memory_cleanup` MCP tool
- [x] 9.7 Conditionally initialize MemoryManager when memory.enabled = true

## 10. CLI Commands
- [x] 10.1 Add `memorySearchCommand` handler to `src/cli/commands.ts`
- [x] 10.2 Add `memorySaveCommand` handler
- [x] 10.3 Add `memoryListCommand` handler
- [x] 10.4 Add `memoryStatsCommand` handler
- [x] 10.5 Add `memoryCleanupCommand` handler
- [x] 10.6 Add `memoryExportCommand` handler
- [x] 10.7 Register `memory` subcommand group in `src/index.ts`

## 11. Skill Template
- [x] 11.1 Create `templates/modules/MEMORY.md` with usage documentation and 3-layer search workflow

## 12. Final Verification
- [x] 12.1 Run `npm run build` — compiles without errors
- [x] 12.2 Run `npm test` — all tests pass
- [x] 12.3 Run `npm run lint` — no warnings
- [x] 12.4 Run `npm run type-check` — no errors
- [x] 12.5 Test CLI flow end-to-end (save → search → list → stats → export → cleanup)
- [x] 12.6 Test MCP tools via stdio transport
