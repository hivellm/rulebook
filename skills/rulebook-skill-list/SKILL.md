---
name: rulebook-skill-list
description: "List all available Rulebook skills, optionally filtered by category or enabled status. Use to discover what skills are available for the project."
version: "1.0.0"
category: mcp
author: "HiveLLM"
tags: ["mcp", "skill", "list", "discovery"]
dependencies: []
conflicts: []
---

# rulebook_skill_list

List all available skills with optional filtering.

## Input Schema

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | enum | No | Filter: `languages`, `frameworks`, `modules`, `services`, `workflows`, `ides`, `core`, `cli`, `git`, `hooks` |
| `enabledOnly` | boolean | No | Show only enabled skills (default: false) |

## Usage

```typescript
// List all skills
await mcp.rulebook_skill_list({});

// List only language skills
await mcp.rulebook_skill_list({ category: "languages" });

// List only enabled skills
await mcp.rulebook_skill_list({ enabledOnly: true });
```

## Response

```json
{
  "success": true,
  "skills": [
    {
      "id": "languages/typescript",
      "name": "TypeScript Support",
      "description": "TypeScript language rules and setup",
      "category": "languages",
      "enabled": true,
      "version": "1.0.0",
      "tags": ["typescript", "strict", "esm"]
    }
  ],
  "count": 1,
  "category": "languages"
}
```

## When to Use

- Discover available skills for the project
- Check which skills are currently enabled
- Browse skills by category
