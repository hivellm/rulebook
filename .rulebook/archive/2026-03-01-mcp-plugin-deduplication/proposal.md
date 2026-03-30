# Proposal: mcp-plugin-deduplication

## Why
When rulebook is installed via `npx` in multiple projects, each project registers its own MCP server entry in `.mcp.json`. Claude Code loads all project MCP servers, resulting in duplicate `rulebook` plugins when switching between projects. This wastes resources and causes confusion with multiple identical tool registrations.

## What Changes
- Add unique project identifier to MCP server name (e.g., `rulebook-<projectId>`)
- Implement deduplication logic in `claude-mcp.ts` that checks for existing rulebook entries
- Use a single shared MCP server entry when possible, with project root passed as argument
- Add `--project-root <path>` flag to MCP server to explicitly set project context
- During `init`/`update`, clean up stale MCP entries from other projects
- Consider using `.claude/settings.json` with `enabledMcpjsonServers` to control per-project activation

## Impact
- Affected specs: RULEBOOK_MCP.md
- Affected code: src/mcp/rulebook-server.ts, src/core/claude-mcp.ts, src/cli/commands.ts
- Breaking change: NO (backward-compatible — old entries still work)
- User benefit: No duplicate plugins across projects, cleaner Claude Code experience, reduced resource usage
