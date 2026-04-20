# Proposal: phase3_compress-mcp

Source: docs/analysis/caveman/02-skill-design.md

## Why

Rulebook's MCP server already exposes 40+ tools, and agents prefer MCP over shell commands for task state. Exposing compression as MCP tools lets agents (Ralph iterations, team leads, implementers) invoke it programmatically without parsing slash commands. Also extends `rulebook doctor` so teams can detect stale `.original.md` backups in CI.

## What Changes

- `src/mcp/rulebook-server.ts` — register `rulebook_compress` tool (single file, returns before/after stats) and `rulebook_compress_list` tool (reports compression state across candidate memory files).
- `src/core/doctor.ts` — add health check: for each `*.original.md` backup in the project, report ratio and flag if `< 10%` savings (probably a false compression or drift).
- `.rulebook/specs/RULEBOOK_MCP.md` — document the two new tools.

## Impact

- Affected specs: `.rulebook/specs/RULEBOOK_MCP.md` (MODIFIED tool inventory)
- Affected code: `src/mcp/rulebook-server.ts`, `src/core/doctor.ts`
- Breaking change: NO
- User benefit: Compression usable by automations; doctor reports unhealthy compressions.
