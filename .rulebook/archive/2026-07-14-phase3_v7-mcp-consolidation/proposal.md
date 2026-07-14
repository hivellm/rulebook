# Proposal: phase3_v7-mcp-consolidation

Source: docs/analysis/v7-performance/

## Why

The v6 MCP server exposes 26 tools whose schemas cost ~3,500 tokens in every
session (F-003), and `.mcp.json` boots the entire CLI bundle (inquirer, blessed,
ora, chokidar) to serve them (~370 ms init). The per-task ceremony of 10–14
separate tool-call turns (F-005) is the cost users feel most; consolidating
lookups into single calls removes whole model turns, not just milliseconds.

## What Changes

- 26 tools consolidate into ≤8 action-parameterized tools: `rulebook_task`,
  `rulebook_memory` (knowledge+learnings+decisions), `rulebook_session`,
  `rulebook_specs`, plus workspace variants; one-line descriptions, terse
  schemas (≤900 tokens total).
- `.mcp.json` generation points at the slim entrypoint
  (`dist/mcp/rulebook-server.js`) with lazy imports and no CLI dependencies in
  the server process; init <150 ms.
- Task-format enforcement moves into `rulebook_task` creation/validation
  (replacing the PreToolUse content regex removed in phase2).
- `rulebook_session start` returns state + plans + knowledge digest in one call,
  replacing 4–5 separate lookups.

## Impact

- Affected specs: RULEBOOK_MCP.md, RULEBOOK.md
- Affected code: src/mcp/rulebook-server.ts, src/mcp/tools/*, .mcp.json
  generation, src/index.ts (mcp-server command)
- Breaking change: YES (tool names change; old names removed)
- User benefit: −74% schema tokens, −60% server init, ceremony drops from
  10–14 turns to 0–2 per small task
