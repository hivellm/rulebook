# Proposal: F10 — Opt-in MCP telemetry (paper-style)

Source: [docs/analysis/v5.3.0/04-features.md#f10](../../../docs/analysis/v5.3.0/04-features.md) · paper §9.2

## Why
The llm-ir-debugging paper recommends instrumenting MCP servers for longitudinal analysis. No rulebook-managed project can currently reproduce that analysis on itself. Local, opt-in, privacy-preserving telemetry enables the same insights.

## What Changes
- New `src/core/telemetry.ts` middleware for the MCP server.
- Records: tool name, latency, success/fail. **Never** records arguments or content.
- Writes to `.rulebook/telemetry/YYYY-MM-DD.ndjson`. Gitignored automatically.
- Opt-in via `--telemetry` flag on `rulebook mcp init`. Default: off.
- Zero cost when disabled (middleware is a no-op).

## Impact
- Affected specs: `.rulebook/telemetry/` (new directory, gitignored)
- Affected code: new `src/core/telemetry.ts`, `src/mcp/rulebook-server.ts`, `src/cli/commands.ts`
- Breaking change: NO (default off)
- User benefit: projects can run their own LLM-tool-usage analysis
