---
name: rulebook-skill-disable
description: "Disable a skill in the project configuration. Removes its rules from the next AGENTS.md generation. Use to remove unwanted capabilities."
version: "1.0.0"
category: mcp
author: "HiveLLM"
tags: ["mcp", "skill", "disable", "configure"]
dependencies: []
conflicts: []
---

# rulebook_skill_disable

Disable a skill in the project configuration.

## Input Schema

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `skillId` | string | Yes | Skill ID to disable (e.g., `languages/typescript`) |

## Usage

```typescript
await mcp.rulebook_skill_disable({ skillId: "languages/typescript" });
```

## Response

```json
{
  "success": true,
  "skillId": "languages/typescript",
  "message": "Skill languages/typescript disabled successfully"
}
```

## Error Response

```json
{
  "success": false,
  "error": "Skill languages/typescript is not currently enabled"
}
```

## When to Use

- Removing a language or framework no longer used
- Disabling rules that conflict with project needs
- Simplifying project configuration
