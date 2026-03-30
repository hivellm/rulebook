# Tasks: Fix MCP Server Per-Session PID

## Phase 1: Core Fix
- [x] Refactor `acquirePidLock()` to use session-scoped PID files (`mcp-server.<pid>.pid`)
- [x] Add `cleanStalePidFiles()` function to scan and remove dead PID files on startup
- [x] Update `releasePidLock()` to handle new naming convention
- [x] Add backward-compat cleanup for old `mcp-server.pid` file format (stale + corrupt)
- [x] Remove the `process.exit(0)` behavior when another instance is detected

## Phase 2: Tests
- [x] Update existing PID lock tests for new multi-instance behavior
- [x] Add test: two concurrent instances can coexist (different PIDs)
- [x] Add test: stale PID files are cleaned on startup
- [x] Add test: backward-compat removes old `mcp-server.pid` format
- [x] Add test: graceful shutdown removes only own PID file
- [x] Add test: cleanStalePidFiles standalone tests (stale-only, non-existent dir, non-PID files)
- [x] Moved PID tests outside Windows-skip block for cross-platform coverage

## Phase 3: Validation
- [x] Run full test suite — 1635 passed, 0 failed
- [x] Run lint — clean
- [x] Run type-check — clean
- [ ] Manual test: two VSCode windows with MCP both work simultaneously
