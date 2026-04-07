# Tasks: F3 — STATE.md auto-regeneration

## 1. Writer
- [ ] 1.1 Create `src/core/state-writer.ts` with `writeState(projectRoot, snapshot): void`
- [ ] 1.2 Define the snapshot shape (active task, phase, last iteration, last gate, health score)
- [ ] 1.3 Respect `manual: true` frontmatter — if present, do nothing

## 2. Hooks
- [ ] 2.1 Call `writeState` from `task-manager.ts` create/update/archive
- [ ] 2.2 Call `writeState` from `ralph-manager.ts` iteration end
- [ ] 2.3 Throttle to at most one write per second (debounce)

## 3. Tail (mandatory)
- [ ] 3.1 Update or create documentation covering the implementation
- [ ] 3.2 Write tests covering the new behavior (`tests/state-writer.test.ts`, opt-out frontmatter, debounce)
- [ ] 3.3 Run tests and confirm they pass
