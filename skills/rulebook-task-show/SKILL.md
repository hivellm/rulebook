---
name: rulebook-task-show
description: "Show complete details of a Rulebook task including proposal, checklist, design, and specs. Use to understand task requirements before implementation."
version: "1.0.0"
category: mcp
author: "HiveLLM"
tags: ["mcp", "task", "show", "details"]
dependencies: []
conflicts: []
---

# rulebook_task_show

Show complete details of a specific Rulebook task.

## Input Schema

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | Task ID to show |

## Usage

```typescript
await mcp.rulebook_task_show({ taskId: "add-auth-system" });
```

## Response

```json
{
  "task": {
    "id": "add-auth-system",
    "title": "Add Authentication System",
    "status": "in-progress",
    "proposal": "# Proposal: Add Authentication...",
    "tasks": "## 1. Implementation\n- [ ] 1.1 Create auth module...",
    "design": "# Technical Design...",
    "specs": {
      "auth": "# Auth Specification\n## ADDED Requirements..."
    },
    "createdAt": "2026-02-18T12:00:00.000Z",
    "updatedAt": "2026-02-18T14:30:00.000Z"
  },
  "found": true
}
```

## When to Use

- Before starting implementation of a task
- Reviewing task specifications and requirements
- Checking task progress and remaining checklist items
- Understanding the "why" behind a planned change
