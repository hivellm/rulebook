---
name: rulebook-task-delete
description: "Permanently delete a Rulebook task. Cannot be undone. Prefer archiving completed tasks instead."
version: "1.0.0"
category: mcp
author: "HiveLLM"
tags: ["mcp", "task", "delete", "destructive"]
dependencies: []
conflicts: []
---

# rulebook_task_delete

Permanently delete a Rulebook task.

## Input Schema

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | Task ID to delete |

## Usage

```typescript
await mcp.rulebook_task_delete({ taskId: "abandoned-task" });
```

## Response

```json
{
  "success": true,
  "taskId": "abandoned-task",
  "message": "Task abandoned-task deleted successfully"
}
```

## Warning

This action is **permanent and cannot be undone**. The entire task directory and all its contents will be removed.

## When to Use

- Removing duplicate or abandoned tasks
- Cleaning up test/temporary tasks
- **Prefer `rulebook_task_archive` for completed tasks**
