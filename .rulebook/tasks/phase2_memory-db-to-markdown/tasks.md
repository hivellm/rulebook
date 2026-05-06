## 1. File store + frontmatter
- [ ] 1.1 Define YAML frontmatter schema in `src/memory/file-store.ts` (id, type, title, summary, project, tags, sessionId, createdAt, updatedAt, accessedAt)
- [ ] 1.2 Implement `FileStore.save(memory)` with atomic temp+rename write
- [ ] 1.3 Implement `FileStore.load(id)`, `FileStore.delete(id)`, `FileStore.list(filter)` via glob over `.rulebook/memory/memories/<year>/<month>/`
- [ ] 1.4 Implement session-file equivalents under `.rulebook/memory/sessions/<year>/<month>/`

## 2. Search and timeline
- [ ] 2.1 Implement `FileSearch.searchBM25(query, opts)` — tf-idf scoring over file content + frontmatter tag boost
- [ ] 2.2 Implement `FileSearch.getTimeline(anchorId, before, after)` — sort all memories by `createdAt`, slice around anchor
- [ ] 2.3 Implement `FileSearch.getFullDetails(ids)` — batch read + frontmatter parse
- [ ] 2.4 Add opt-in inverted index file `.rulebook/memory/.index.json` rebuilt lazily on save when `memoryCount > 1000`

## 3. Manager rewire
- [ ] 3.1 Rewrite `MemoryManager` so all public methods (`saveMemory`, `searchMemories`, `getTimeline`, `getFullDetails`, `startSession`, `endSession`, `getStats`, `cleanup`, `exportMemories`) use `FileStore` + `FileSearch`
- [ ] 3.2 Drop `indexHealth` from `getStats`, add `fileCount`
- [ ] 3.3 Replace `MemoryCache` (LRU on bytes) with age-based retention in `cleanup({ maxAgeDays })`

## 4. Migration from existing DB
- [ ] 4.1 Add `rulebook memory migrate-from-db` CLI command that reads `.rulebook/memory/memory.db` and writes one .md per row
- [ ] 4.2 Auto-detect legacy DB on `MemoryManager.initialize()` — run migration, then rename `memory.db` → `memory.db.legacy`
- [ ] 4.3 Convert background indexer code-graph storage from SQLite tables to JSONL log under `.rulebook/memory/codegraph/`
- [ ] 4.4 Document the migration path in `docs/memory.md`

## 5. Removal of DB stack
- [ ] 5.1 Delete `src/memory/memory-store.ts`, `memory-search.ts`, `memory-vectorizer.ts`, `memory-cache.ts`, `hnsw-index.ts`, `sql-js.d.ts`
- [ ] 5.2 Remove `sql.js`, `better-sqlite3` from `package.json` dependencies and optionalDependencies; remove `@types/better-sqlite3` from devDeps
- [ ] 5.3 Delete `tests/hnsw-*.test.ts`, `tests/memory-vectorizer.test.ts`, and other tests of the removed modules; rewrite `tests/memory-*.test.ts` against the file store
- [ ] 5.4 Update `src/cli/commands/memory.ts` — drop the `verify` subcommand (no index to verify)
- [ ] 5.5 Update `src/mcp/rulebook-server.ts` — keep MCP tool surface unchanged but rewire to file-based manager

## 6. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 6.1 Update or create documentation covering the implementation
- [ ] 6.2 Write tests covering the new behavior
- [ ] 6.3 Run tests and confirm they pass
