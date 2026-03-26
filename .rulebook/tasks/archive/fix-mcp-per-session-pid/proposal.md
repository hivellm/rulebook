# Fix: MCP Server Per-Session PID — Allow Multiple Concurrent Instances

## Problem

The PID lock introduced in commit `70a99da` (fix memory leak) uses a single file `.rulebook/mcp-server.pid` per project. When multiple VSCode windows are open with different projects (each with its own MCP configuration), or even the same project in multiple windows, only the **first** MCP server instance runs — subsequent instances detect the alive PID and call `process.exit(0)`.

This breaks multi-window workflows where each VSCode/Claude Code session needs its own MCP server.

## Root Cause

`acquirePidLock()` writes a single PID file per project root. The check `process.kill(existingPid, 0)` sees the first instance is alive and exits, even though the second instance belongs to a completely different client session.

## Proposed Solution

Replace the single-PID-per-project lock with a **multi-instance tracking** approach:

1. **Session-scoped PID files**: Use `mcp-server.<pid>.pid` instead of `mcp-server.pid`, allowing each instance to register itself independently
2. **Startup cleanup**: On startup, scan all `mcp-server.*.pid` files — remove stale ones (dead PIDs), keep alive ones
3. **Self-cleanup on shutdown**: Each instance removes only its own PID file (already implemented via `releasePidLock`)
4. **Orphan detection unchanged**: The stdin monitoring (`stdin.on('end'/'close')` + 30s poll) already handles orphan detection per-instance — no changes needed

This preserves the memory leak fix (orphan detection via stdin) while allowing concurrent MCP servers.

## Impact

- **MCP server**: PID lock functions in `src/mcp/rulebook-server.ts`
- **Tests**: PID lock tests in `tests/mcp-server.test.ts`
- **No breaking changes**: The new approach is backwards-compatible (cleans up old single PID file on first run)
