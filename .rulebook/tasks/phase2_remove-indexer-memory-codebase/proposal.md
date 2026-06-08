# Proposal: phase2_remove-indexer-memory-codebase

## Why

The semantic-memory subsystem — `BackgroundIndexer` (BM25 + HNSW), the SQLite
memory store, the code-graph, and the `codebase_search` / `codebase_graph`
tools — is effectively dead outside the Rulebook dev repo itself. Evidence
across 8 projects:

- `.rulebook/memory/codegraph/nodes.jsonl` is populated in **Rulebook only**
  (1579 nodes). The other 7 projects have **no codegraph** at all.
- `memory.enabled` is `false` in Cortex and Tml; `true` only in Rulebook.
- The lightweight knowledge/learnings/decisions features (markdown files) are
  used heavily in the mature projects and do **not** require the memory DB.

So a heavy always-on background process and 9 of the 35 MCP tools serve, in
practice, a single repo. The user's decision is to **remove the subsystem**,
not just default it off.

## What Changes

Remove, end-to-end:

- **MCP tools (9):** `memory_save`, `memory_search`, `memory_get`,
  `memory_timeline`, `memory_stats`, `memory_cleanup`, `codebase_search`,
  `codebase_graph`, `indexer_status`. MCP surface drops 35 → 26.
- **Subsystems:** `BackgroundIndexer`, `MemoryManager` + SQLite store +
  codegraph, codebase search/graph modules, their config blocks in
  `rulebook.json` (`memory`, indexer/watcher settings).
- **CLI:** `memory*` commands and any indexer command in `src/index.ts`.
- **Docs/templates:** the "Persistent Memory" sections in `CLAUDE.md`,
  `AGENTS.md`, `.claude/rules/*`, and the MCP reference generator output.

Explicitly **kept** (must not regress):

- `knowledge_*`, `learn_*`, `decision_*` — file-based, independently used.
- `session_start` / `session_end` — repoint to `PLANS.md` only if currently
  memory-backed; otherwise keep as-is. No memory DB dependency may remain.

## Impact

- Affected specs: `specs/mcp-surface/spec.md` (this task)
- Affected code: `src/mcp/rulebook-server.ts`, `src/core/indexer/*`,
  `src/core/memory/*` (or equivalent), `src/index.ts`, config-manager,
  MCP reference generator, the rule/template docs, and all related tests.
- Breaking change: YES — removes 9 public MCP tools, CLI commands, and the
  `memory` config block (target release 6.0.0). Existing `.rulebook/memory/`
  data is left on disk untouched (no destructive deletion of user data).
- User benefit: no always-on indexer process; smaller, honest tool surface;
  faster cold start; the still-useful file-based knowledge/learn/decision
  features remain.

## Risks

- `knowledge_*` / `learn_*` / `decision_*` or `session_*` may share helpers
  with the memory store. Task item 1.1 audits this before any deletion.
- Heavy doc/template surface references memory; all must be updated so generated
  projects stop advertising removed tools.
