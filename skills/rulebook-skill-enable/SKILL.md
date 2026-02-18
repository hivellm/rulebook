---
name: rulebook-skill-enable
description: "Enable a skill in the project configuration. Checks for conflicts with existing skills. Use to add new capabilities to the project."
version: "1.0.0"
category: mcp
author: "HiveLLM"
tags: ["mcp", "skill", "enable", "configure"]
dependencies: []
conflicts: []
---

# rulebook_skill_enable

Enable a skill in the project configuration.

## Input Schema

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `skillId` | string | Yes | Skill ID to enable (e.g., `languages/typescript`) |

## Usage

```typescript
await mcp.rulebook_skill_enable({ skillId: "languages/typescript" });
```

## Response

```json
{
  "success": true,
  "skillId": "languages/typescript",
  "message": "Skill languages/typescript enabled successfully",
  "warnings": [],
  "conflicts": []
}
```

## When to Use

- Adding a new language or framework to the project
- Enabling additional quality rules
- Activating integration modules
