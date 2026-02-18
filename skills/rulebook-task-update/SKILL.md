---
name: rulebook-task-update
description: "Update a Rulebook task status. Use to mark tasks as in-progress, completed, or blocked."
version: "1.0.0"
category: mcp
author: "HiveLLM"
tags: ["mcp", "task", "update", "status"]
dependencies: []
conflicts: []
---

# rulebook_task_update

Update a Rulebook task's status.

## Input Schema

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | Task ID to update |
| `status` | enum | No | New status: `pending`, `in-progress`, `completed`, `blocked` |

## Usage

```typescript
// Start working on a task
await mcp.rulebook_task_update({ taskId: "add-auth-system", status: "in-progress" });

// Mark task as completed
await mcp.rulebook_task_update({ taskId: "add-auth-system", status: "completed" });

// Mark task as blocked
await mcp.rulebook_task_update({ taskId: "add-auth-system", status: "blocked" });
```

## Response

```json
{
  "success": true,
  "taskId": "add-auth-system",
  "message": "Task add-auth-system updated successfully"
}
```

## When to Use

- Starting work on a task -> `in-progress`
- Finishing implementation -> `completed`
- Hitting a blocker -> `blocked`
- Resetting a task -> `pending`
