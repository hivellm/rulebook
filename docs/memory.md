# Memory subsystem (v5.6+) — file-based persistence

Rulebook persists memories and sessions as plain markdown files. There
is no SQLite database, no WASM runtime, no compiled native dependency,
and no on-disk vector index. The store is diffable, greppable, and
hand-editable.

## On-disk layout

```
.rulebook/memory/
├── memories/
│   └── <YYYY>/<MM>/<id>-<slug>.md
├── sessions/
│   └── <YYYY>/<MM>/<id>-<slug>.md
├── codegraph/
│   ├── nodes.jsonl
│   └── edges.jsonl
└── .index.json          (lazy; written only when memoryCount > 1000)
```

Each `.md` file carries YAML frontmatter plus the content body:

```markdown
---
id: <uuid>
type: bugfix | feature | refactor | decision | discovery | change | observation
title: "Short title"
summary: "Optional rich summary"
project: "<project-name>"
tags: ["a", "b"]
sessionId: <uuid?>
createdAt: <epoch-ms>
updatedAt: <epoch-ms>
accessedAt: <epoch-ms>
---
The memory body, in markdown.
```

## Search

`MemoryManager.searchMemories({ query, mode, type, project, limit })` runs
BM25 over the file corpus with a tag-frontmatter boost. The legacy modes
`hybrid` and `vector` accept the same input as before but route execution
to BM25 — there is no vector lane in v5.6+. `matchType` on every result
is `bm25`.

For corpora >1000 memories, an inverted-index sidecar
(`<root>/.index.json`) is refreshed lazily on save. Below the threshold
the in-memory build is faster than re-reading the sidecar.

## Cleanup

`MemoryManager.cleanup({ maxAgeDays })` deletes memory files whose
`createdAt` is older than the threshold. With no `maxAgeDays`, cleanup is
a no-op. The legacy LRU byte-budget eviction was removed.

## Stats

`MemoryManager.getStats()` returns:

```ts
{
  dbSizeBytes: number;   // sum of all managed file sizes
  memoryCount: number;
  sessionCount: number;
  fileCount: number;     // total files on disk
  oldestMemory?: number;
  newestMemory?: number;
  maxSizeBytes: number;
  usagePercent: number;
}
```

`indexHealth` was removed in v5.6.

## Migration from a legacy SQLite store

On the first `MemoryManager.initialize()` after upgrading from an older
release, an existing `.rulebook/memory/memory.db` is detected, every
row is exported to a markdown file, and the source is renamed to
`memory.db.legacy`. The runtime never reads SQLite again.

Manual one-shot migration:

```bash
rulebook memory migrate-from-db
```

Idempotent — safe to invoke twice. Reports memory + session counts.

If neither `better-sqlite3` nor `sql.js` is installed locally (both were
removed from `package.json` in v5.6), the migrator is a graceful no-op
and reports zero counts. Users with a legacy DB who need migration
should `npm install sql.js` first, then run the command above.

## Code-graph persistence

The background indexer writes `CodeNode` and `CodeEdge` records to
`.rulebook/memory/codegraph/{nodes,edges}.jsonl` (one JSON object per
line). On a re-index, `deleteCodeNodesByFile()` compacts the nodes log
to drop entries belonging to the affected file path while preserving
the latest entry per id for everything else.

## Why this changed

- Removed flaky native dep (`better-sqlite3`) and heavy WASM dep
  (`sql.js`).
- Memories are diffable, greppable, hand-editable, git-trackable.
- BM25 over markdown bodies recalls the same memories at the typical
  scale (<1K entries) as the legacy BM25 + HNSW hybrid.
- Smaller install, simpler mental model, no index drift to monitor.
