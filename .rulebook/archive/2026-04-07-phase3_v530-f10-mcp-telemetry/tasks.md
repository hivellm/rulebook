# Tasks: F10 — Opt-in MCP telemetry

## 1. Telemetry module
- [x] 1.1 Created `src/core/telemetry.ts` with `createTelemetryMiddleware(config)` and `withTelemetry(mw, toolName, handler)`
- [x] 1.2 Records `{ tool, latency_ms, success, timestamp }` only — never arguments, never content
- [x] 1.3 Appends to `.rulebook/telemetry/YYYY-MM-DD.ndjson`
- [x] 1.4 No-op when disabled (zero overhead)

## 2. CLI / wiring
- [x] 2.1 Added `--telemetry` flag to `rulebook mcp init` in `src/cli/commands/mcp.ts`
- [x] 2.2 Persists `features.telemetry: true` in `.rulebook/rulebook.json` config
- [x] 2.3 `src/mcp/rulebook-server.ts` installs telemetry middleware on every tool handler (records in finally block)
- [x] 2.4 `.rulebook/telemetry/` added to `.gitignore` via `ensureGitignoreEntries`

## 3. Tail (mandatory)
- [x] 3.1 Update or create documentation covering the implementation
- [x] 3.2 Write tests covering the new behavior
- [x] 3.3 Run tests and confirm they pass
