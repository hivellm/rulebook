---
name: rulebook-task-validate
description: "Validate a Rulebook task format and structure against OpenSpec requirements. Use before archiving or to verify task quality."
version: "1.0.0"
category: mcp
author: "HiveLLM"
tags: ["mcp", "task", "validate", "quality"]
dependencies: []
conflicts: []
---

# rulebook_task_validate

Validate a Rulebook task's format and structure.

## Input Schema

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | Task ID to validate |

## Usage

```typescript
await mcp.rulebook_task_validate({ taskId: "add-auth-system" });
```

## Response

```json
{
  "valid": true,
  "errors": [],
  "warnings": ["Consider adding more scenarios to specs/auth/spec.md"]
}
```

## Validation Rules

- `proposal.md` must exist with `## Why` section (min 20 characters)
- `tasks.md` must contain only checklist items
- Specs must use `SHALL` or `MUST` keywords
- Scenarios must use `####` headers (4 hashtags)
- Scenarios should follow Given/When/Then structure

## When to Use

- Before archiving a completed task
- After writing specs to verify format
- As a quality check during task planning
