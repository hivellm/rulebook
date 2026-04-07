# Tasks: F10 — Opt-in MCP telemetry

## 1. Telemetry module
- [ ] 1.1 Create `src/core/telemetry.ts` with middleware that wraps MCP tool dispatch
- [ ] 1.2 Record `{ tool, latency_ms, success, timestamp }` only — no arguments, no content
- [ ] 1.3 Append to `.rulebook/telemetry/YYYY-MM-DD.ndjson`
- [ ] 1.4 No-op when disabled (zero overhead)

## 2. CLI / wiring
- [ ] 2.1 Add `--telemetry` flag to `rulebook mcp init`
- [ ] 2.2 Persist setting in `.rulebook/rulebook.json`
- [ ] 2.3 `src/mcp/rulebook-server.ts` reads the setting and installs the middleware
- [ ] 2.4 Add `.rulebook/telemetry/` to `.gitignore` (via F6 helper)

## 3. Tail (mandatory)
- [ ] 3.1 Update or create documentation covering the implementation
- [ ] 3.2 Write tests covering the new behavior (privacy: no arg leakage; opt-in default off; ndjson format)
- [ ] 3.3 Run tests and confirm they pass
