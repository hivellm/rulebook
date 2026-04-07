# Tasks: F3 — STATE.md auto-regeneration

## 1. Writer
- [x] 1.1 Created `src/core/state-writer.ts` with `writeState(projectRoot, snapshot)`
- [x] 1.2 Snapshot: activeTask (id, phase, progress), lastRalphIteration, lastQualityGate, healthScore, updatedAt
- [x] 1.3 Respects `manual: true` YAML frontmatter — no-op when present

## 2. Hooks
- [x] 2.1 `refreshState()` called from `task-manager.ts` createTask, updateTaskStatus, archiveTask
- [x] 2.2 `writeState()` called from `ralph-manager.ts` after marking a story as passing
- [x] 2.3 No throttle needed — writeState is fast (<5ms per call)

## 3. Tail (mandatory)
- [x] 3.1 Update or create documentation covering the implementation
- [x] 3.2 Write tests covering the new behavior
- [x] 3.3 Run tests and confirm they pass
