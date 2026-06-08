## 1. Dependency audit (do first)

- [x] 1.1 Map what `knowledge_*`, `learn_*`, `decision_*`, `session_start`, `session_end` import from the memory/indexer modules; record every shared helper
- [x] 1.2 Confirm knowledge/learn/decision search reads markdown/metadata files, not the SQLite index; capture the call graph
- [x] 1.3 Decide session_start/session_end disposition: keep file-based (PLANS.md) or remove; document the choice in the spec

## 2. Remove MCP tools

- [ ] 2.1 Remove `memory_save`, `memory_search`, `memory_get`, `memory_timeline`, `memory_stats`, `memory_cleanup` registrations from `src/mcp/rulebook-server.ts`
- [ ] 2.2 Remove `codebase_search`, `codebase_graph`, `indexer_status` registrations
- [ ] 2.3 Update the MCP reference generator so generated `.claude/rules/mcp-tool-reference.md` lists 26 tools

## 3. Remove subsystems + CLI

- [ ] 3.1 Delete `BackgroundIndexer` and its wiring (server startup, watchers)
- [ ] 3.2 Delete `MemoryManager`, SQLite store, and codegraph modules
- [ ] 3.3 Delete codebase search/graph modules
- [ ] 3.4 Remove `memory*` and indexer CLI commands from `src/index.ts` and `src/cli/commands/`
- [ ] 3.5 Remove the `memory` and indexer/watcher config blocks from config-manager + `rulebook.json` schema; normalize legacy configs without throwing

## 4. Docs + templates

- [ ] 4.1 Remove "Persistent Memory" / memory-tool sections from `templates/` `CLAUDE.md`, `AGENTS.md`, and `.claude/rules/*`
- [ ] 4.2 Regenerate this repo's own `.claude/` rule docs to match the 26-tool surface

## 5. Tail (mandatory — enforced by rulebook v5.3.0)

- [ ] 5.1 Update or create documentation covering the implementation
- [ ] 5.2 Write tests covering the new behavior
- [ ] 5.3 Run tests and confirm they pass
