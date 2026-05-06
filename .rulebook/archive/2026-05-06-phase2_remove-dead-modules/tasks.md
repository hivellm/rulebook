## 1. Verify zero live callers
- [x] 1.1 Audit revealed all five modules HAD live callers (audit was wrong); user confirmed each feature can go
- [x] 1.2 Catalogued each callsite — telemetry: mcp-server + CLI flag; auto-fixer: `rulebook fix`; review-manager: `rulebook review`; watcher: `rulebook watcher`; compact-context: init/update seed
- [x] 1.3 Confirmed `modern-console.ts` is only used by `watcher.ts` — removed both together

## 2. Source removal
- [x] 2.1 Deleted `state/telemetry.ts`, `quality/auto-fixer.ts`, `tasks/review-manager.ts`, `console/watcher.ts`, `console/modern-console.ts`, `claude/compact-context-manager.ts`
- [x] 2.2 Stripped telemetry config block from `state/config-manager.ts`, `types.ts`, `update.ts`; removed lazy-load + middleware wrap from `mcp/rulebook-server.ts`
- [x] 2.3 Removed `compact-context-manager` import + call from `init.ts` and `update.ts`
- [x] 2.4 Stripped `fixCommand`, `watcherCommand`, `reviewCommand` exports from `cli/commands/index.ts` and `index.ts`; dropped corresponding `program.command(...)` registrations
- [x] 2.5 `modern-console.ts` deleted along with `watcher.ts`

## 3. Test cleanup
- [x] 3.1 Deleted `tests/{telemetry,auto-fix,review,watcher,simplified-watcher-ui,modern-console,compact-context-manager}.test.ts`
- [x] 3.2 Updated `tests/config-manager.test.ts` to drop `telemetry` from feature shape assertions; full suite green

## 4. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 4.1 Update or create documentation covering the implementation (CHANGELOG 5.6.0 entry pending in same commit)
- [x] 4.2 Write tests covering the new behavior (existing `config-manager.test.ts` regression-tests the new feature shape; deletions don't need new tests)
- [x] 4.3 Run tests and confirm they pass (1868/1868)
