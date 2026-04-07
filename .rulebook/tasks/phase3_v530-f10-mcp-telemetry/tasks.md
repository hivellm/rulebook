# Tasks: F10 — Opt-in MCP telemetry

## 1. Telemetry module
- [x] 1.1 Created `src/core/telemetry.ts` with `createTelemetryMiddleware(config)` and `withTelemetry(mw, toolName, handler)` wrapper
- [x] 1.2 Records `{ tool, latency_ms, success, timestamp }` only — never arguments, never content
- [x] 1.3 Appends to `.rulebook/telemetry/YYYY-MM-DD.ndjson`
- [x] 1.4 No-op when disabled (zero overhead — middleware.record is an empty function)

## 2. CLI / wiring
- [ ] 2.1 Add `--telemetry` flag to `rulebook mcp init` — deferred (module ready, flag registration in next pass)
- [ ] 2.2 Persist setting in `.rulebook/rulebook.json` — config type already has the field slot
- [ ] 2.3 `src/mcp/rulebook-server.ts` install middleware — deferred (withTelemetry wrapper ready)
- [ ] 2.4 Add `.rulebook/telemetry/` to `.gitignore` — deferred (F6 gitignore utility ready)

## 3. Tail (mandatory)
- [x] 3.1 Documentation: inline JSDoc, privacy guarantees documented
- [x] 3.2 Tests: `tests/telemetry.test.ts` (4 tests: no-op disabled, NDJSON format, privacy field check, withTelemetry wrapper)
- [x] 3.3 Full suite: **1755 passed, 0 failed**, lint clean, type-check clean
