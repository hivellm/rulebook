---
name: rulebook-skill-search
description: "Search for skills by name, description, or tags. Use to find skills matching specific requirements or technologies."
version: "1.0.0"
category: mcp
author: "HiveLLM"
tags: ["mcp", "skill", "search", "discovery"]
dependencies: []
conflicts: []
---

# rulebook_skill_search

Search for skills by name, description, or tags.

## Input Schema

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |

## Usage

```typescript
// Search by technology name
await mcp.rulebook_skill_search({ query: "typescript" });

// Search by feature
await mcp.rulebook_skill_search({ query: "quality" });

// Search by tag
await mcp.rulebook_skill_search({ query: "testing" });
```

## Response

```json
{
  "success": true,
  "query": "typescript",
  "skills": [
    {
      "id": "languages/typescript",
      "name": "TypeScript Support",
      "description": "TypeScript language rules and setup",
      "category": "languages",
      "enabled": true
    }
  ],
  "count": 1
}
```

## When to Use

- Finding skills for a specific technology
- Discovering skills related to a topic
- Searching before enabling new skills
