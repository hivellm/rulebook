# Proposal: phase2_memory-db-to-markdown

## Why

The persistent memory subsystem currently stores everything in a SQLite
database (`.rulebook/memory/memory.db`) plus a binary HNSW index file
(`vectors.hnsw`). This brings real cost:

- **Two heavy dependencies**: `sql.js` (WASM SQLite, hundreds of KB) and the
  optional native `better-sqlite3` (compiled binary, can fail to install on
  Windows / Alpine). Both are imported only by `src/memory/memory-store.ts`.
- **Opaque storage**: memories are not human-readable, not greppable, not
  diffable in git. Users cannot inspect or manually edit a memory.
- **Drift risk**: HNSW index can de-sync from the DB and rebuilds
  silently — `MemoryStats.indexHealth` exists specifically to surface this
  failure mode.
- **Maintenance overhead**: 8 files in `src/memory/` (memory-store,
  memory-manager, memory-search, memory-vectorizer, memory-cache,
  memory-hooks, hnsw-index, memory-types) plus `sql-js.d.ts`. The HNSW
  pure-TS implementation alone is non-trivial.
- **Marginal benefit**: typical projects have <1 K memories. BM25 + HNSW
  fusion is over-engineered for that scale; plain `glob + grep` over
  markdown returns in <50 ms for that size.

Switching to plain markdown files makes memories git-trackable,
hand-editable, and removes both SQLite dependencies. The trade-off — losing
true semantic vector search — is acceptable: for small corpora, BM25 over
file content + frontmatter tag filter recalls the same memories.

## What Changes

- New on-disk layout under `.rulebook/memory/`:
  ```
  .rulebook/memory/
  ├── memories/
  │   └── 2026/05/<id>-<slug>.md
  └── sessions/
      └── 2026/05/<id>-<slug>.md
  ```
- Memory file format: YAML frontmatter (`id`, `type`, `title`, `summary`,
  `project`, `tags`, `sessionId`, `createdAt`, `updatedAt`, `accessedAt`)
  followed by the memory body in markdown.
- New `src/memory/file-store.ts` replacing `memory-store.ts`. Operations:
  - `save(memory)` → atomic temp+rename write
  - `load(id)` → read + parse one file
  - `list({ project, type, tags, since, until })` → glob + frontmatter filter
  - `delete(id)` → unlink
- New `src/memory/file-search.ts` replacing `memory-search.ts`:
  - **BM25 lane preserved**: rebuilt as a per-call ripgrep + tf-idf score over
    matching files, or an opt-in inverted index file
    (`.rulebook/memory/.index.json`) refreshed lazily on save.
  - **Vector/HNSW lane removed**. Hybrid mode falls back to BM25.
  - Timeline: read all files, sort by `createdAt` frontmatter, slice around
    anchor.
- `MemoryManager` API kept as-is for callers (`saveMemory`,
  `searchMemories`, `getTimeline`, `getFullDetails`, `startSession`,
  `endSession`, `getStats`, `cleanup`) — implementations rewritten over the
  file store.
- `getStats` drops `indexHealth`, adds `fileCount`. `cleanup` becomes
  age-based retention (delete memories older than `maxAgeDays`, default
  unbounded). `MemoryCache` is removed entirely.
- One-shot migrator `rulebook memory migrate-from-db` (and a startup
  auto-detect) reads any existing `memory.db`, writes one `.md` per row,
  then renames `memory.db` → `memory.db.legacy` for safety. After one
  release, the migrator + the legacy file are deleted.
- Background indexer's `code_nodes` / `code_edges` tables move to a separate
  JSONL log under `.rulebook/memory/codegraph/` — same migration pattern.
- Remove `sql.js` and `better-sqlite3` from `package.json` `dependencies`
  and `optionalDependencies`. Remove `@types/better-sqlite3` from devDeps.
  Remove `sql-js.d.ts`.

## Impact

- Affected specs:
  - `RULEBOOK_MCP.md` — update memory tool descriptions (semantic search
    becomes "keyword + tag", not vector hybrid).
- Affected code:
  - `src/memory/*` — full rewrite. `memory-store.ts`, `memory-search.ts`,
    `memory-vectorizer.ts`, `memory-cache.ts`, `hnsw-index.ts`,
    `sql-js.d.ts` removed. New `file-store.ts`, `file-search.ts`.
  - `src/cli/commands/memory.ts` — small adjustments (no `verify`/`indexHealth`).
  - `src/mcp/rulebook-server.ts` — `rulebook_memory_*` tools wired to the
    new manager (no schema changes for callers).
  - `src/core/workspace/project-worker.ts`, `workspace-manager.ts` — point
    at file-based memory dir per project.
  - `src/core/indexer/background-indexer.ts` — switch `saveCodeNode` /
    `saveCodeEdge` to JSONL log.
  - `package.json` — remove `sql.js`, `better-sqlite3`, `@types/better-sqlite3`.
  - `tests/` — rewrite memory tests against the file store; remove HNSW tests.
- Breaking change: **YES** for users with existing `memory.db` who do not run
  the migrator (the runtime no longer reads SQLite). Mitigated by automatic
  one-time migration on first start.
- User benefit: memories are now plain files — diffable, greppable,
  hand-editable, git-trackable. Removes a flaky native dep (`better-sqlite3`)
  and a heavy WASM dep (`sql.js`). Smaller install, simpler mental model.
