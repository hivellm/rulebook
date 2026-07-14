---
name: "Rulebook Task Management"
description: "Spec-driven task management for features and breaking changes with OpenSpec-compatible format"
version: "1.0.0"
category: "core"
author: "Rulebook"
tags: ["task-management", "openspec", "spec-driven", "workflow"]
dependencies: []
conflicts: []
---

# Rulebook Task Management

Use Rulebook's task system for spec-driven development. Create a task BEFORE implementing any feature, breaking change, architecture change, or performance/security work. Skip it for bug fixes, typos, and non-breaking dependency updates.

## Workflow

1. Create the task: `rulebook task create <task-id>` (or `rulebook_task` via MCP)
2. Write `proposal.md`, `tasks.md`, and spec deltas
3. Validate: `rulebook task validate <task-id>`
4. Implement, checking off `tasks.md` items in order
5. Archive when done: `rulebook task archive <task-id>`

Prefer the MCP tools (`rulebook_task/list/show/validate/archive`) when the MCP server is enabled. Never create task directories by hand.

## Structure

```
.rulebook/tasks/<task-id>/
├── proposal.md         # Why and what changes
├── tasks.md            # Checklist only — no explanations
├── design.md           # Technical design (optional)
└── specs/<module>/spec.md
```

## Formats

`proposal.md`: `## Why` + `## What Changes` + `## Impact` (affected specs/code, breaking Y/N).

`tasks.md`: numbered phases with `- [ ] 1.1 <simple item>` entries only.

Spec deltas (`specs/<module>/spec.md`):

```markdown
## ADDED Requirements

### Requirement: <Name>
The system SHALL <do something>.

#### Scenario: <Name>
Given <context>
When <action>
Then <expected result>
```

Use `## ADDED` / `## MODIFIED` / `## REMOVED` headers; scenarios use 4 hashtags.

See `.rulebook/specs/rulebook.md` for the full format reference.
