# 06 — Mandatory Task Tail (docs + tests + verification)

**User directive (2026-04-07):** every task created via `rulebook task create` (and every Ralph user story) MUST end with these items, in this order, as the LAST entries of `tasks.md`:

1. `- [ ] Update or create documentation covering the implementation`
2. `- [ ] Write tests covering the new behavior`
3. `- [ ] Run tests and confirm they pass`

Rationale: tasks routinely get marked done with code-only deltas, leaving docs stale and coverage gaps. Making this a structural part of the template (not a convention) means the checklist itself blocks premature archival.

## v5.3.0 action — F-NEW-3 (P0)

- `src/core/task-manager.ts` → `createTask()`: append the three items to every generated `tasks.md` after the user-provided body. Idempotent: if the items already exist (case-insensitive match on the leading verb), do not duplicate.
- `src/core/prd-generator.ts` → same three items appended to each Ralph user story's `acceptanceCriteria`.
- `src/core/task-manager.ts` → `validateTask()` / `archiveTask()`: **refuse to archive** if any of the three tail items is unchecked. Error message must name which item is missing.
- `templates/core/TASK_TEMPLATE.md` (new): canonical template referenced by the generator, so users editing manually see the same tail.
- MCP: `rulebook_task_create` and `rulebook_task_archive` inherit the same enforcement (they already route through `task-manager.ts`).
- Tests: `tests/task-manager.test.ts` — three new cases (auto-append, idempotent on re-create, archive blocked when tail unchecked).
- Migration: `rulebook update` scans existing `tasks/*/tasks.md` and offers to append the tail to active tasks (prompted, not automatic, to avoid surprising users mid-task).

This pairs naturally with the existing `.claude/rules/no-deferred.md` and `.claude/rules/no-shortcuts.md` — those forbid skipping work; this forbids declaring it done without docs+tests.
