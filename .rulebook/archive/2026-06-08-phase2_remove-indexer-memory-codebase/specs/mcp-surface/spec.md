# Spec: mcp-surface

## REMOVED Requirements

### Requirement: Memory, codebase, and indexer MCP tools removed
The rulebook MCP server MUST NOT register `memory_save`, `memory_search`,
`memory_get`, `memory_timeline`, `memory_stats`, `memory_cleanup`,
`codebase_search`, `codebase_graph`, or `indexer_status`. The
`BackgroundIndexer` MUST NOT start with the server.

#### Scenario: Removed tools are absent from the MCP surface
Given the rulebook MCP server has started
When the registered tool list is enumerated
Then none of the nine removed tools are present
And the total registered tool count is 26

#### Scenario: No background indexer process starts
Given the MCP server boots in a project
When startup completes
Then no `BackgroundIndexer` watcher or indexing thread is running

## Audit findings (phase 2, item 1)

- `knowledge-manager`, `learn-manager`, `decision-manager`, `plans-manager`
  import nothing from `src/memory/*` or `src/core/indexer/*` — fully decoupled.
- `session_start` / `session_end` are PLANS.md-based; memory use is optional and
  guarded (`if (memoryManager)` / `if (args.query && memoryManager)`).
- Disposition: **keep** `session_start` / `session_end`, removing only the
  optional memory branches (memory search in start, `saveMemory` in end).
- Deletion set: `src/memory/*` (6), `src/core/indexer/*` (3),
  `src/cli/commands/memory.ts`, codebase search/graph module. Rewire:
  `rulebook-server.ts`, `index.ts`, `update.ts` (ralph memory-purge block),
  `config-manager.ts` + `types.ts` (memory/indexer config), `project-worker.ts`,
  `workspace-manager.ts`, MCP reference generator.

## ADDED Requirements

### Requirement: File-based knowledge/learn/decision retained
`knowledge_*`, `learn_*`, and `decision_*` MUST keep working without the memory
store or indexer.

#### Scenario: Knowledge list works without the memory subsystem
Given the memory/indexer subsystem has been removed
When `rulebook_knowledge_list` is invoked in a project with knowledge files
Then it returns the entries read from markdown/metadata files
And no call references the removed memory store

#### Scenario: Existing memory data is not destroyed
Given a project with an existing `.rulebook/memory/` directory
When the upgraded rulebook runs
Then the on-disk `.rulebook/memory/` data is left untouched
