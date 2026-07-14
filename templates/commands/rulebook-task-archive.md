---
name: /rulebook-task-archive
id: rulebook-task-archive
category: Rulebook
description: Archive a completed Rulebook task and apply spec deltas to main specifications.
---
<!-- RULEBOOK:START -->
Archive a completed task, applying its spec deltas to the main specifications.

**Usage**
```bash
rulebook task validate <task-id>
rulebook task archive <task-id>
rulebook task archive <task-id> --skip-validation   # only if certain the task is valid
```

**What it does**
1. Verifies completion: all `tasks.md` items `[x]`, tests pass, docs updated.
2. Runs quality checks first: `npm test`, `npm run lint`, `npm run type-check`, `npm run build`.
3. Validates format, applies spec deltas, and moves the task to `/.rulebook/tasks/archive/YYYY-MM-DD-<task-id>/`.
4. Verify with `rulebook task list --archived`; then update CHANGELOG.md and document breaking changes.

**Deferred items rule**
Before archiving a task with deferred items, create a Rulebook task (`rulebook_task_create`) for every deferred item or group, with its own `tasks.md` and full context. Never archive with untracked deferred work.

**Reference**
- Task management guidelines: `/.rulebook/specs/rulebook.md`

**MCP equivalent**: `rulebook_task_archive`
<!-- RULEBOOK:END -->
