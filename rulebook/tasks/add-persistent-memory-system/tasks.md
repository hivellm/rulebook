## 1. Core Types and Data Model
- [ ] 1.1 Create `src/memory/memory-types.ts` with all interfaces (Memory, MemorySession, MemorySearchResult, MemorySearchOptions, MemoryConfig, MemoryStats, TimelineEntry)
- [ ] 1.2 Add MemoryConfig to RulebookConfig in `src/types.ts`
- [ ] 1.3 Add memory defaults to `src/core/config-manager.ts` (initialization + migration)

## 2. TF-IDF Vectorizer
- [ ] 2.1 Create `src/memory/memory-vectorizer.ts` with feature hashing (FNV1a)
- [ ] 2.2 Implement tokenization (lowercase, split, stop words removal)
- [ ] 2.3 Implement TF-IDF weighting with L2 normalization
- [ ] 2.4 Implement cosine similarity function
- [ ] 2.5 Write tests `tests/memory-vectorizer.test.ts`

## 3. HNSW Vector Index
- [ ] 3.1 Create `src/memory/hnsw-index.ts` with pure TypeScript HNSW implementation
- [ ] 3.2 Implement multi-layer graph structure with navigable small world
- [ ] 3.3 Implement add/search/remove operations with cosine distance
- [ ] 3.4 Implement serialize/deserialize for disk persistence
- [ ] 3.5 Write tests `tests/memory-hnsw-index.test.ts`

## 4. SQLite Storage Layer
- [ ] 4.1 Add `sql.js` dependency to package.json
- [ ] 4.2 Create `src/memory/memory-store.ts` with sql.js WASM initialization
- [ ] 4.3 Implement schema creation (memories, sessions, memory_fts, vector_labels, vectorizer_meta)
- [ ] 4.4 Implement FTS5 virtual table with BM25 ranking and sync triggers
- [ ] 4.5 Implement CRUD operations for memories and sessions
- [ ] 4.6 Implement BM25 search via FTS5 MATCH
- [ ] 4.7 Implement auto-save to disk (every N writes + on close)
- [ ] 4.8 Write tests `tests/memory-store.test.ts`

## 5. Hybrid Search Engine
- [ ] 5.1 Create `src/memory/memory-search.ts` with Reciprocal Rank Fusion (RRF)
- [ ] 5.2 Implement BM25-only, vector-only, and hybrid search modes
- [ ] 5.3 Implement 3-layer search pattern (compact → timeline → full details)
- [ ] 5.4 Implement timeline search (chronological context window)
- [ ] 5.5 Write tests `tests/memory-search.test.ts`

## 6. Cache Size Limiter
- [ ] 6.1 Create `src/memory/memory-cache.ts` with LRU eviction algorithm
- [ ] 6.2 Implement size tracking (DB + HNSW index)
- [ ] 6.3 Implement eviction with protected memory types (decisions, active sessions)
- [ ] 6.4 Implement configurable max size with 15% headroom target
- [ ] 6.5 Write tests `tests/memory-cache.test.ts`

## 7. Memory Manager (Orchestrator)
- [ ] 7.1 Create `src/memory/memory-manager.ts` as public API
- [ ] 7.2 Implement lazy initialization of all sub-components
- [ ] 7.3 Implement CRUD operations (saveMemory, getMemory, deleteMemory)
- [ ] 7.4 Implement search delegation (searchMemories, getTimeline)
- [ ] 7.5 Implement session lifecycle (startSession, endSession)
- [ ] 7.6 Implement privacy filter (strip `<private>` tags)
- [ ] 7.7 Implement export (JSON/CSV)
- [ ] 7.8 Write tests `tests/memory-manager.test.ts`

## 8. Agent Capture Hooks
- [ ] 8.1 Create `src/memory/memory-hooks.ts` with auto-classification heuristics
- [ ] 8.2 Implement captureFromClaudeCode adapter
- [ ] 8.3 Implement captureFromCursor adapter
- [ ] 8.4 Implement captureFromGemini adapter
- [ ] 8.5 Modify `src/core/agent-manager.ts` to integrate memory capture

## 9. MCP Server Integration
- [ ] 9.1 Add `rulebook_memory_search` MCP tool
- [ ] 9.2 Add `rulebook_memory_timeline` MCP tool
- [ ] 9.3 Add `rulebook_memory_get` MCP tool
- [ ] 9.4 Add `rulebook_memory_save` MCP tool
- [ ] 9.5 Add `rulebook_memory_stats` MCP tool
- [ ] 9.6 Add `rulebook_memory_cleanup` MCP tool
- [ ] 9.7 Conditionally initialize MemoryManager when memory.enabled = true

## 10. CLI Commands
- [ ] 10.1 Add `memorySearchCommand` handler to `src/cli/commands.ts`
- [ ] 10.2 Add `memorySaveCommand` handler
- [ ] 10.3 Add `memoryListCommand` handler
- [ ] 10.4 Add `memoryStatsCommand` handler
- [ ] 10.5 Add `memoryCleanupCommand` handler
- [ ] 10.6 Add `memoryExportCommand` handler
- [ ] 10.7 Register `memory` subcommand group in `src/index.ts`

## 11. Skill Template
- [ ] 11.1 Create `templates/modules/MEMORY.md` with usage documentation and 3-layer search workflow

## 12. Final Verification
- [ ] 12.1 Run `npm run build` — compiles without errors
- [ ] 12.2 Run `npm test` — all tests pass
- [ ] 12.3 Run `npm run lint` — no warnings
- [ ] 12.4 Run `npm run type-check` — no errors
- [ ] 12.5 Test CLI flow end-to-end (save → search → list → stats → export → cleanup)
- [ ] 12.6 Test MCP tools via stdio transport
