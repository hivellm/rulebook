---
name: /rulebook-task-show
id: rulebook-task-show
category: Rulebook
description: Show detailed information about a specific Rulebook task.
---
<!-- RULEBOOK:START -->
Show a task's status, dates, proposal summary, and spec files.

**Usage**
```bash
rulebook task show <task-id>
```

**What it does**
1. Displays task ID, title, status, created/updated/archive dates, proposal summary, and spec file list.
2. Read `proposal.md` for the why/what and impact assessment.
3. Read `tasks.md` for completed (`[x]`) vs pending (`[ ]`) items.
4. Read `specs/*/spec.md` for requirements and scenarios.

**Reference**
- Task management guidelines: `/.rulebook/specs/rulebook.md`

**MCP equivalent**: `rulebook_task`
<!-- RULEBOOK:END -->
