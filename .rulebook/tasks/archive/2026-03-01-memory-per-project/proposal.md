# Proposal: memory-per-project

## Why
The persistent memory system is configured with `dbPath: '.rulebook/memory/memory.db'` and the `.rulebook/memory/` directory is created, but the actual SQLite database file is not being written to the correct project-relative path when running via `npx`. The `MemoryManager` receives `projectRoot` from the MCP server's `process.cwd()`, but with `npx` execution the working directory may not match the project root. This causes the `.db` file to be created in the wrong location or not at all, breaking per-project memory isolation.

## What Changes
- Fix `MemoryManager` initialization to always resolve `dbPath` relative to the detected `.rulebook` directory (not `process.cwd()`)
- Ensure MCP server passes the correct project root (from `findRulebookConfig`) to `createMemoryManager`
- Add explicit directory creation for `.rulebook/memory/` during `init` command
- Validate that memory.db exists at expected path and log warning if missing
- Add `memory verify` subcommand to diagnose memory storage location issues
- Ensure `npx` execution always resolves to the correct project directory

## Impact
- Affected specs: MEMORY.md
- Affected code: src/memory/memory-manager.ts, src/memory/memory-store.ts, src/mcp/rulebook-server.ts, src/cli/commands.ts
- Breaking change: NO (fixes existing behavior)
- User benefit: Memory actually persists per-project as intended, works reliably with npx
