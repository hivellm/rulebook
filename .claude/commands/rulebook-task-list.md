---
name: /rulebook-task-list
id: rulebook-task-list
category: Rulebook
description: List all Rulebook tasks (active and optionally archived).
---
<!-- RULEBOOK:START -->
List tasks with their status (pending, in-progress, completed, blocked).

**Usage**
```bash
rulebook task list
rulebook task list --archived   # include archived tasks
```

**What it does**
1. Lists active tasks with status; `--archived` includes archived ones.
2. For details on one task: `rulebook task show <task-id>`.

**Reference**
- Task management guidelines: `/.rulebook/specs/rulebook.md`

**MCP equivalent**: `rulebook_task`
<!-- RULEBOOK:END -->
