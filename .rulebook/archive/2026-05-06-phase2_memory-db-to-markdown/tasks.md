## 1. File store + frontmatter
- [x] 1.1 Define YAML frontmatter schema in `src/memory/file-store.ts` (id, type, title, summary, project, tags, sessionId, createdAt, updatedAt, accessedAt)
- [x] 1.2 Implement `FileStore.save(memory)` with atomic temp+rename write
- [x] 1.3 Implement `FileStore.load(id)`, `FileStore.delete(id)`, `FileStore.list(filter)` via walk over `.rulebook/memory/memories/<year>/<month>/`
- [x] 1.4 Implement session-file equivalents under `.rulebook/memory/sessions/<year>/<month>/`

## 2. Search and timeline
- [x] 2.1 Implement BM25 (tf-idf) scoring over file content + frontmatter tag boost in `src/memory/file-search.ts`
- [x] 2.2 Implement `FileSearch.getTimeline(anchorId, window)` — sort all memories by `createdAt`, slice around anchor
- [x] 2.3 Implement `FileSearch.getFullDetails(ids)` — batch read + frontmatter parse with `accessedAt` bump
- [x] 2.4 Add opt-in inverted-index file `.rulebook/memory/.index.json` rebuilt lazily via `maybeRebuildIndex` when `memoryCount > 1000` (called from `MemoryManager.saveMemory`)

## 3. Manager rewire
- [x] 3.1 Rewrite `MemoryManager` so all public methods (`saveMemory`, `searchMemories`, `getTimeline`, `getFullDetails`, `startSession`, `endSession`, `getStats`, `cleanup`, `exportMemories`) use `FileStore` + `FileSearch`
- [x] 3.2 Drop `indexHealth` from `getStats`, add `fileCount`
- [x] 3.3 Replace `MemoryCache` (LRU on bytes) with age-based retention in `cleanup({ maxAgeDays })`

## 4. Migration from existing DB
- [x] 4.1 Add `rulebook memory migrate-from-db` CLI command (`memoryMigrateFromDbCommand`) reading `.rulebook/memory/memory.db` and writing one .md per row
- [x] 4.2 Auto-detect legacy DB on `MemoryManager.initialize()` — `src/memory/legacy-migrator.ts` runs migration, then renames `memory.db` → `memory.db.legacy`
- [x] 4.3 Convert background indexer code-graph storage from SQLite tables to JSONL log under `.rulebook/memory/codegraph/{nodes,edges}.jsonl`
- [x] 4.4 Document the migration path in `docs/memory.md`

## 5. Removal of DB stack
- [x] 5.1 Deleted `src/memory/memory-store.ts`, `memory-search.ts`, `memory-vectorizer.ts`, `memory-cache.ts`, `hnsw-index.ts`, `sql-js.d.ts`
- [x] 5.2 Removed `sql.js` (dependency), `better-sqlite3` (optionalDependency), `@types/better-sqlite3` (devDependency) from `package.json`
- [x] 5.3 Deleted `tests/memory-store*.test.ts`, `tests/memory-search.test.ts`, `tests/memory-cache.test.ts`, `tests/memory-hnsw-index.test.ts`, `tests/memory-vectorizer.test.ts`; rewrote `tests/memory-manager.test.ts`, `tests/memory-coverage.test.ts`, `tests/memory-per-project.test.ts` against the file store
- [x] 5.4 Updated `src/cli/commands/memory.ts` — `memoryVerifyCommand` removed; `memory verify` CLI command unwired in `src/index.ts`; `cleanup` rewired to age-based; stats display drops `indexHealth`
- [x] 5.5 Updated `src/mcp/rulebook-server.ts` — MCP tool surface unchanged; rewired transparently via the unchanged `MemoryManager` public API

## 6. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 6.1 Update or create documentation covering the implementation (CHANGELOG.md Unreleased section + new docs/memory.md describing layout, search, migration, code-graph)
- [x] 6.2 Write tests covering the new behavior (rewritten tests/memory-manager.test.ts, tests/memory-coverage.test.ts, tests/memory-per-project.test.ts — 25 tests covering CRUD, BM25 search, sessions, code-graph append/compact, age-based cleanup, lazy-migrator no-op)
- [x] 6.3 Run tests and confirm they pass — `npm run type-check` clean, `npm run lint` clean, `npm test` 1309 pass (1 pre-existing unrelated failure in tests/enforce-pre-tool-shell.test.ts verified against clean release/v5.6.0)
