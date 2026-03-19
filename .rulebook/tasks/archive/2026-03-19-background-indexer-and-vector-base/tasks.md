## 1. Core Parsing & Entities
- [x] 1.1 Create base types in `src/core/indexer/indexer-types.ts` (CodeNode and CodeEdge)
- [x] 1.2 Create `src/core/indexer/file-parser.ts` with semantic chunking logic
- [x] 1.3 Update `src/core/memory/memory-types.ts` to support graph queries

## 2. HNSW & SQLite Adapters
- [x] 2.1 Modify `MemoryStore` (`src/core/memory/memory-store.ts`) to include `code_nodes` and `code_edges` tables
- [x] 2.2 Update insertion and deletion logic to clear orphaned nodes
- [x] 2.3 Create methods in `MemoryManager` (`src/core/memory/memory-manager.ts`) to handle SQLite transactions

## 3. Background Worker Daemon
- [x] 3.1 Create `src/core/indexer/background-indexer.ts` 
- [x] 3.2 Coupling directory watch system and debounce Queue
- [x] 3.3 Ensure strict exclusion of paths ignored by .gitignore and .rulebook

## 4. MCP Integration
- [x] 4.1 Update `src/mcp/rulebook-server.ts`
- [x] 4.2 Create MCP tool `rulebook_codebase_search`
- [x] 4.3 Create MCP tool `rulebook_codebase_graph`
- [x] 4.4 Create MCP tool `rulebook_indexer_status`

## 5. Testing & Validation
- [x] 5.1 Create unit tests `tests/indexer.test.ts`
- [x] 5.2 Assess impact on the `health` command
- [x] 5.3 Update PRD generator MOCKs
