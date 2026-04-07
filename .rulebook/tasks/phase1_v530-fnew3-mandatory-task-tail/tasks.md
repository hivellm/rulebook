# Tasks: F-NEW-3 — Mandatory task tail

## 1. Template
- [ ] 1.1 Create `templates/core/TASK_TEMPLATE.md` with the canonical structure including the three tail items
- [ ] 1.2 Define a `TAIL_ITEMS` constant in `src/core/task-manager.ts` (single source of truth)

## 2. Generator
- [ ] 2.1 `task-manager.ts createTask()` appends tail items after the user-provided body
- [ ] 2.2 Idempotent: case-insensitive match on the leading verb prevents duplication
- [ ] 2.3 `prd-generator.ts` injects the same three items into each Ralph user story's `acceptanceCriteria`

## 3. Validation gate
- [ ] 3.1 `task-manager.ts validateTask()` returns errors when any tail item is unchecked
- [ ] 3.2 `task-manager.ts archiveTask()` refuses to archive and names the missing item
- [ ] 3.3 MCP `rulebook_task_archive` surfaces the same error

## 4. Migration
- [ ] 4.1 `rulebook update` scans `.rulebook/tasks/*/tasks.md` for missing tails and prompts (never automatic)

## 5. Tail (mandatory)
- [ ] 5.1 Update or create documentation covering the implementation
- [ ] 5.2 Write tests covering the new behavior (auto-append, idempotency, archive blocked, prd injection)
- [ ] 5.3 Run tests and confirm they pass
