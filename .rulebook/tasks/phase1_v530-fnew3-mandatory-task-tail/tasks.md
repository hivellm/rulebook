# Tasks: F-NEW-3 — Mandatory task tail

## 1. Template
- [x] 1.1 Template defined inline via `renderMandatoryTail()` in `src/core/task-manager.ts`
- [x] 1.2 Defined `MANDATORY_TAIL_ITEMS` constant (3 items with label + regex matcher)

## 2. Generator
- [x] 2.1 `task-manager.ts createTask()` appends tail via `renderMandatoryTail(sectionNumber)`
- [x] 2.2 Idempotent: `checkMandatoryTail()` uses case-insensitive regex match
- [x] 2.3 `prd-generator.ts` injects the same three items into each Ralph user story's `acceptanceCriteria`

## 3. Validation gate
- [x] 3.1 `task-manager.ts validateTask()` returns errors when any tail item is missing or unchecked
- [x] 3.2 `task-manager.ts archiveTask()` refuses to archive via existing validation step
- [x] 3.3 MCP `rulebook_task_archive` surfaces the same error (routes through task-manager.ts)

## 4. Migration
- [ ] 4.1 `rulebook update` scan for missing tails — deferred to v5.4 (requires prompt UI for user confirmation)

## 5. Tail (mandatory)
- [x] 5.1 Documentation: inline JSDoc, exported constants + functions
- [x] 5.2 Tests: 7 cases in `tests/task-manager.test.ts`
- [x] 5.3 Full suite passing, lint clean, type-check clean
