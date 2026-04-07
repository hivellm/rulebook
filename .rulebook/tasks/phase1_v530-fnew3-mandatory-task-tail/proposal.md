# Proposal: F-NEW-3 — Mandatory docs+tests+verify tail on every task

Source: [docs/analysis/v5.3.0/06-task-tail.md](../../../docs/analysis/v5.3.0/06-task-tail.md)

## Why
Tasks routinely get marked done with code-only deltas, leaving docs stale and coverage gaps. Making "update docs / write tests / run tests" a structural part of every task template (not a convention) means the checklist itself blocks premature archival.

## What Changes
- Every task created via `rulebook task create` and every Ralph user story gains three fixed final items:
  1. Update or create documentation covering the implementation
  2. Write tests covering the new behavior
  3. Run tests and confirm they pass
- `validateTask()` / `archiveTask()` refuse to archive when any tail item is unchecked.
- Idempotent: re-creating a task does not duplicate the tail.
- New `templates/core/TASK_TEMPLATE.md` is the canonical source.
- Migration: `rulebook update` offers (prompted, never automatic) to append the tail to active tasks.

## Impact
- Affected specs: `templates/core/TASK_TEMPLATE.md` (new)
- Affected code: `src/core/task-manager.ts`, `src/core/prd-generator.ts`
- Breaking change: NO
- User benefit: structural enforcement that nothing ships without docs and passing tests
