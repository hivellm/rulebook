## 1. Verify zero live callers
- [ ] 1.1 Grep `src/` for `telemetry`, `auto-fixer`, `review-manager`, `watcher`, `compact-context-manager` and document every callsite
- [ ] 1.2 Confirm none of the callsites are wired to CLI commands, MCP tools, or hooks (config-only refs are OK to remove)
- [ ] 1.3 Decide whether `modern-console.ts` becomes unreachable after `watcher.ts` removal

## 2. Source removal
- [ ] 2.1 Delete `src/core/telemetry.ts`, `src/core/auto-fixer.ts`, `src/core/review-manager.ts`, `src/core/watcher.ts`, `src/core/compact-context-manager.ts`
- [ ] 2.2 Remove `telemetry` config block from `src/core/config-manager.ts` and any references in `detector.ts` / `mcp/rulebook-server.ts`
- [ ] 2.3 Remove the `compact-context-manager` callsite from `src/cli/commands/init.ts` and delete its template asset
- [ ] 2.4 Strip imports/re-exports from `src/index.ts`
- [ ] 2.5 If `modern-console.ts` is now orphaned, delete it; otherwise leave untouched

## 3. Test cleanup
- [ ] 3.1 Delete `tests/auto-fixer*.test.ts`, `tests/review-manager*.test.ts`, `tests/telemetry*.test.ts`, `tests/watcher*.test.ts`, `tests/compact-context*.test.ts`
- [ ] 3.2 Run the full suite and fix any orphan imports

## 4. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 4.1 Update or create documentation covering the implementation
- [ ] 4.2 Write tests covering the new behavior
- [ ] 4.3 Run tests and confirm they pass
