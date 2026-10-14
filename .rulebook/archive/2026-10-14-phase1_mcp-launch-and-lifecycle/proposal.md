# Proposal: phase1_mcp-launch-and-lifecycle

## Why
Every project launches the MCP server with `npx … @latest` (0.93–1.73 s, 4 processes, ~200 MB per session, cold reinstall after each release); three code paths write three different entries and none can pin or upgrade a v7 entry; the server exits on client death only by side effect; MCP tools have no annotations so Codex's reviewer screens each call (+2.1–2.8 s) (docs/analysis/multi-session-performance/03-mcp-lifecycle.md F-013..F-019; 05 F-037).

## What Changes
- One writer for .mcp.json entries (claude-mcp.ts); `rulebook mcp init` and legacy-migrator use it.
- Generated entry pinned to the installed version; `update` rewrites `@latest` and legacy `mcp-server` entries.
- Explicit stdin end/close → exit; fix the wrong "prevent multiple instances" comment.
- MCP tool annotations (readOnlyHint / destructiveHint / openWorldHint) per action, or read/write split where needed.

## Impact
- Affected specs: docs/analysis/multi-session-performance/08-execution-plan.md
- Affected code: src/core/claude/claude-mcp.ts, src/cli/commands/mcp.ts, src/core/workspace/legacy-migrator.ts, src/mcp/rulebook-server.ts, src/mcp/tools/v7-tools.ts, tests/v7-budgets.test.ts
- Breaking change: NO (entries are rewritten by update)
- User benefit: Same pinned version in every session; no per-release cold install; server cannot outlive its client; Codex skips review of read-only calls.
