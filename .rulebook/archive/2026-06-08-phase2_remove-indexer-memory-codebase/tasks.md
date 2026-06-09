## 1. Dependency audit (do first)

- [x] 1.1 Map what `knowledge_*`, `learn_*`, `decision_*`, `session_start`, `session_end` import from the memory/indexer modules; record every shared helper
- [x] 1.2 Confirm knowledge/learn/decision search reads markdown/metadata files, not the SQLite index; capture the call graph
- [x] 1.3 Decide session_start/session_end disposition: keep file-based (PLANS.md) or remove; document the choice in the spec

## 2. Remove MCP tools

- [x] 2.1 Remove `memory_save`, `memory_search`, `memory_get`, `memory_timeline`, `memory_stats`, `memory_cleanup` registrations from `src/mcp/rulebook-server.ts`
- [x] 2.2 Remove `codebase_search`, `codebase_graph`, `indexer_status` registrations (and the memory-backed `workspace_search`)
- [x] 2.3 MCP surface verified at 25 tools

## 3. Remove subsystems + CLI

- [x] 3.1 Delete `BackgroundIndexer` and its wiring (server startup, watchers)
- [x] 3.2 Delete `MemoryManager`, file store/search, codegraph, legacy migrator modules
- [x] 3.3 Delete codebase search/graph registrations
- [x] 3.4 Remove `memory*` CLI commands from `src/index.ts` and `src/cli/commands/`
- [x] 3.5 Remove the `memory` and indexer config blocks from config-manager + types; normalize legacy configs without throwing

## 4. Docs + templates

- [x] 4.1 Remove "Persistent Memory" / memory-tool sections from `templates/` and `.claude/rules/*`
- [x] 4.2 Update this repo's own AGENTS.md/CLAUDE.md/.claude to match the slimmed surface

## 5. Tail (mandatory — enforced by rulebook v5.3.0)

- [x] 5.1 Update or create documentation covering the implementation
- [x] 5.2 Write tests covering the new behavior
- [x] 5.3 Run tests and confirm they pass
