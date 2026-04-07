# Tasks: F-NEW-3 — Mandatory task tail

## 1. Template
- [x] 1.1 Template defined inline via `renderMandatoryTail()` in `src/core/task-manager.ts` (separate file `templates/core/TASK_TEMPLATE.md` deferred — the function IS the canonical source)
- [x] 1.2 Defined `MANDATORY_TAIL_ITEMS` constant in `src/core/task-manager.ts` (3 items with label + regex matcher)

## 2. Generator
- [x] 2.1 `task-manager.ts createTask()` appends tail via `renderMandatoryTail(sectionNumber)` after the user-provided body
- [x] 2.2 Idempotent: `checkMandatoryTail()` uses case-insensitive regex match on the leading verb
- [ ] 2.3 `prd-generator.ts` injection into Ralph acceptance criteria — deferred to when Ralph integration is tested

## 3. Validation gate
- [x] 3.1 `task-manager.ts validateTask()` returns errors when any tail item is missing or unchecked, naming which
- [x] 3.2 `task-manager.ts archiveTask()` refuses to archive via existing validation step (inherits validateTask)
- [x] 3.3 MCP `rulebook_task_archive` surfaces the same error (routes through task-manager.ts)

## 4. Migration
- [ ] 4.1 `rulebook update` scan for missing tails — deferred to v5.4 (requires prompt UI for user confirmation)

## 5. Tail (mandatory)
- [x] 5.1 Documentation: inline JSDoc, exported constants + functions
- [x] 5.2 Tests: 7 new cases in `tests/task-manager.test.ts` (auto-append, unchecked detection, archive blocking, archive success after check, render, constant count, missing-section)
- [x] 5.3 Full suite: 1721 passing, 0 failing, lint clean, type-check clean
