---
name: rulebook-skill-validate
description: "Validate the current skills configuration for conflicts, missing dependencies, and errors. Use to ensure skills are properly configured."
version: "1.0.0"
category: mcp
author: "HiveLLM"
tags: ["mcp", "skill", "validate", "quality"]
dependencies: []
conflicts: []
---

# rulebook_skill_validate

Validate the current skills configuration.

## Input Schema

No parameters required.

## Usage

```typescript
await mcp.rulebook_skill_validate({});
```

## Response

```json
{
  "success": true,
  "valid": true,
  "errors": [],
  "warnings": ["Skill 'languages/typescript' depends on 'nodejs' which is not enabled"],
  "conflicts": [],
  "enabledCount": 5
}
```

## Checks Performed

- Missing dependencies between skills
- Conflicting skills enabled simultaneously
- Invalid or malformed skill configurations
- Orphaned skill references

## When to Use

- After enabling or disabling skills
- During project setup to verify configuration
- As a health check for skill configuration
