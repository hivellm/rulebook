# Tasks: F3 — STATE.md auto-regeneration

## 1. Writer
- [x] 1.1 Created `src/core/state-writer.ts` with `writeState(projectRoot, snapshot)`
- [x] 1.2 Snapshot: activeTask (id, phase, progress), lastRalphIteration, lastQualityGate, healthScore, updatedAt
- [x] 1.3 Respects `manual: true` YAML frontmatter — `isManuallyMaintained()` returns true → no-op

## 2. Hooks
- [x] 2.1 `refreshState()` called from `task-manager.ts` createTask, updateTaskStatus, archiveTask
- [ ] 2.2 Call from `ralph-manager.ts` iteration end — deferred (Ralph doesn't call writeState yet; next iteration of Ralph integration)
- [x] 2.3 No throttle needed — writeState is fast (<5ms per call)

## 3. Tail (mandatory)
- [x] 3.1 Documentation: inline JSDoc, auto-generation comment in rendered output
- [x] 3.2 Tests: `tests/state-writer.test.ts` (7 tests)
- [x] 3.3 Full suite passing, lint clean, type-check clean
