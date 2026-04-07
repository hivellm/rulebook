# Tasks: F3 — STATE.md auto-regeneration

## 1. Writer
- [x] 1.1 Created `src/core/state-writer.ts` with `writeState(projectRoot, snapshot): Promise<{ path, written }>`
- [x] 1.2 Snapshot shape: `StateSnapshot` with activeTask (id, phase, progress), lastRalphIteration, lastQualityGate, healthScore, updatedAt
- [x] 1.3 Respects `manual: true` YAML frontmatter — `isManuallyMaintained()` returns true → writeState is no-op

## 2. Hooks
- [ ] 2.1 Call `writeState` from `task-manager.ts` create/update/archive — deferred to wiring pass (module ready, hook not wired yet)
- [ ] 2.2 Call `writeState` from `ralph-manager.ts` iteration end — deferred
- [ ] 2.3 Throttle/debounce — deferred (writeState is fast enough for now)

## 3. Tail (mandatory)
- [x] 3.1 Documentation: inline JSDoc, auto-generation comment in rendered output
- [x] 3.2 Tests: `tests/state-writer.test.ts` (7 tests: active task, no task, Ralph+health, manual opt-out, isManuallyMaintained, overwrite, under 40 lines)
- [x] 3.3 Full suite passing, lint clean, type-check clean
