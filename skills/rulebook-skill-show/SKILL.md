---
name: rulebook-skill-show
description: "Show detailed information about a specific skill including metadata, content preview, and enabled status. Use to inspect a skill before enabling it."
version: "1.0.0"
category: mcp
author: "HiveLLM"
tags: ["mcp", "skill", "show", "details"]
dependencies: []
conflicts: []
---

# rulebook_skill_show

Show detailed information about a specific skill.

## Input Schema

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `skillId` | string | Yes | Skill ID (e.g., `languages/typescript`) |

## Usage

```typescript
await mcp.rulebook_skill_show({ skillId: "languages/typescript" });
```

## Response

```json
{
  "success": true,
  "skill": {
    "id": "languages/typescript",
    "name": "TypeScript Support",
    "description": "TypeScript language rules and setup",
    "category": "languages",
    "enabled": true,
    "version": "1.0.0",
    "author": "HiveLLM",
    "tags": ["typescript", "strict", "esm"],
    "dependencies": ["nodejs"],
    "conflicts": ["javascript-basic"],
    "content": "# TypeScript Rules\n..."
  }
}
```

## When to Use

- Inspect skill content before enabling
- Check dependencies and conflicts
- Review what rules a skill provides
