---
name: /rulebook-task-create
id: rulebook-task-create
category: Rulebook
description: Create a new Rulebook task following OpenSpec-compatible format with Context7 MCP validation.
---
<!-- RULEBOOK:START -->
Create a new task in OpenSpec-compatible format.

**Usage**
```bash
rulebook task create <task-id>     # verb-led kebab-case, unique (e.g. add-feature)
rulebook task validate <task-id>
```

**What it does**
1. Optionally query Context7 MCP (`@Context7 /fission-ai/openspec`) for the official OpenSpec format.
2. Run `rulebook task list` and explore related code so the proposal matches current implementation.
3. `rulebook task create <task-id>` scaffolds `/.rulebook/tasks/<task-id>/` with `proposal.md`, `tasks.md`, and `specs/`.
4. Write `proposal.md`: Why (≥20 chars), What Changes, Impact.
5. Write `tasks.md` as phased `- [ ]` checklist items including validation steps.
6. Write spec deltas in `specs/<module>/spec.md`, then `rulebook task validate <task-id>` and fix errors.

**Spec delta format**
- Headers: `## ADDED|MODIFIED|REMOVED|RENAMED Requirements`
- `### Requirement: <Name>` with SHALL/MUST keywords
- `#### Scenario: <Name>` (4 hashtags, not 3) using Given/When/Then

**Reference**
- Task management guidelines: `/.rulebook/specs/rulebook.md`

**MCP equivalent**: `rulebook_task_create`
<!-- RULEBOOK:END -->
