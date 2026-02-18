---
name: rulebook-task-archive
description: "Archive a completed Rulebook task to the archive directory with date prefix. Use after a task is fully implemented and validated."
version: "1.0.0"
category: mcp
author: "HiveLLM"
tags: ["mcp", "task", "archive", "cleanup"]
dependencies: []
conflicts: []
---

# rulebook_task_archive

Archive a completed Rulebook task.

## Input Schema

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | Task ID to archive |
| `skipValidation` | boolean | No | Skip validation before archiving (default: false) |

## Usage

```typescript
// Archive with validation (recommended)
await mcp.rulebook_task_archive({ taskId: "add-auth-system" });

// Archive without validation
await mcp.rulebook_task_archive({ taskId: "add-auth-system", skipValidation: true });
```

## Response

```json
{
  "success": true,
  "taskId": "add-auth-system",
  "message": "Task add-auth-system archived successfully"
}
```

## Archive Location

Tasks are moved to: `rulebook/tasks/archive/YYYY-MM-DD-<task-id>/`

## When to Use

- After task implementation is complete
- After all tests pass and task is validated
- To clean up the active tasks list
