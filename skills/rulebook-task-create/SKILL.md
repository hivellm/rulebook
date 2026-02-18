---
name: rulebook-task-create
description: "Create a new Rulebook task with standardized directory structure. Use when starting a new feature, breaking change, or architectural work that needs spec-driven planning."
version: "1.0.0"
category: mcp
author: "HiveLLM"
tags: ["mcp", "task", "create", "planning"]
dependencies: []
conflicts: []
---

# rulebook_task_create

Create a new Rulebook task with full directory structure.

## Input Schema

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | Task ID in kebab-case (e.g., `add-auth-system`) |

## Usage

```typescript
await mcp.rulebook_task_create({ taskId: "add-auth-system" });
```

## Response

```json
{
  "success": true,
  "taskId": "add-auth-system",
  "message": "Task add-auth-system created successfully"
}
```

## Created Structure

```
rulebook/tasks/add-auth-system/
├── .metadata.json    # Status: pending
├── proposal.md       # Why + What Changes + Impact
├── tasks.md          # Simple checklist items only
├── design.md         # Technical design (optional)
└── specs/
    └── <module>/
        └── spec.md   # SHALL/MUST requirements
```

## When to Use

- Starting a new feature or capability
- Planning a breaking change
- Architecture changes requiring specs
- Any work that needs structured planning
