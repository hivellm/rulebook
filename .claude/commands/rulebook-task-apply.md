---
name: /rulebook-task-apply
id: rulebook-task-apply
category: Rulebook
description: Implement an approved Rulebook task and keep tasks checklist in sync.
---
<!-- RULEBOOK:START -->
Implement an approved task item by item, keeping `tasks.md` in sync with reality.

**Usage**
```bash
rulebook task show <task-id>       # read scope first
rulebook task validate <task-id>   # check format before archiving
```

**What it does**
1. Read `proposal.md`, `design.md` (if present), and `tasks.md` to confirm scope and acceptance criteria.
2. Work through the `tasks.md` checklist sequentially, keeping edits minimal and scoped.
3. After each item: implement, test, verify coverage (`npm test -- --coverage`), mark `[x]` in `tasks.md` immediately, commit locally.
4. Before finishing: every item checked, all tests pass, coverage meets threshold, docs updated.

**Reference**
- Task management guidelines: `/.rulebook/specs/rulebook.md`

**MCP equivalent**: `rulebook_task`, `rulebook_task`, `rulebook_task`
<!-- RULEBOOK:END -->
