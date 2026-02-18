---
name: rulebook-task-list
description: "List all Rulebook tasks with optional status filtering and archive inclusion. Use to check project tasks, progress, or find tasks by status."
version: "1.0.0"
category: mcp
author: "HiveLLM"
tags: ["mcp", "task", "list", "status"]
dependencies: []
conflicts: []
---

# rulebook_task_list

List all Rulebook tasks with optional filtering.

## Input Schema

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `includeArchived` | boolean | No | Include archived tasks (default: false) |
| `status` | enum | No | Filter: `pending`, `in-progress`, `completed`, `blocked` |

## Usage

```typescript
// List active tasks
await mcp.rulebook_task_list({});

// List only in-progress tasks
await mcp.rulebook_task_list({ status: "in-progress" });

// Include archived tasks
await mcp.rulebook_task_list({ includeArchived: true });
```

## Response

```json
{
  "tasks": [
    {
      "id": "add-auth-system",
      "title": "Add Authentication System",
      "status": "in-progress",
      "createdAt": "2026-02-18T12:00:00.000Z",
      "updatedAt": "2026-02-18T14:30:00.000Z"
    }
  ],
  "count": 1
}
```

## When to Use

- Check current project task status
- Find tasks to work on
- Review completed/archived tasks
- Get overview of project planning state
