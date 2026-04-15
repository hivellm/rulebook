---
name: rulebook-mcp
description: "Lists available MCP tools, configures server connections, and manages task/skill lifecycle via JSON-RPC. Use when connecting to the Rulebook MCP server, listing available tools, creating or archiving tasks programmatically, enabling or disabling skills, troubleshooting MCP configuration, or adding MCP integration to a new IDE."
version: "2.0.0"
category: core
author: "HiveLLM"
tags: ["mcp", "model-context-protocol", "server", "integration", "overview"]
dependencies: []
conflicts: []
---

# Rulebook MCP Server

13 tools for programmatic task and skill management via the Model Context Protocol (stdio transport, JSON-RPC 2.0).

## Setup and Configuration

```bash
rulebook mcp init    # Generate .mcp.json config
rulebook-mcp         # Start the server
```

Add to your IDE config (`.cursor/mcp.json`, `.claude/mcp.json`, or `.vscode/mcp.json`):

```json
{
  "mcpServers": {
    "rulebook": {
      "command": "rulebook-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

Set `RULEBOOK_MCP_DEBUG=1` for debug output on stderr.

## Available Tools

### Task Management (7 tools)

| Tool | Description |
|------|-------------|
| `rulebook_task_create` | Create task with directory structure (proposal.md, tasks.md, specs/) |
| `rulebook_task_list` | List tasks filtered by status (`pending`, `in-progress`, `done`) |
| `rulebook_task_show` | Show full task details including proposal and checklist |
| `rulebook_task_update` | Update task status and metadata |
| `rulebook_task_validate` | Validate task structure before implementation |
| `rulebook_task_archive` | Archive completed task (requires docs + tests + passing) |
| `rulebook_task_delete` | Permanently delete task and directory |

### Skill Management (6 tools)

| Tool | Description |
|------|-------------|
| `rulebook_skill_list` | List skills by category (`core`, `dev`, `languages`, `frameworks`) |
| `rulebook_skill_show` | Show skill content and metadata |
| `rulebook_skill_enable` | Enable a skill in `.rulebook/rulebook.json` |
| `rulebook_skill_disable` | Disable a skill without removing files |
| `rulebook_skill_search` | Search skills by keyword or tag |
| `rulebook_skill_validate` | Validate all enabled skills for conflicts |

## Task Lifecycle Workflow

```typescript
// 1. Create → 2. Implement → 3. Validate → 4. Archive
const task = await mcp.rulebook_task_create({
  taskId: "add-auth-system",
  title: "Add JWT authentication",         // required
  description: "Implement auth middleware"  // optional
});

await mcp.rulebook_task_update({
  taskId: "add-auth-system",
  status: "in-progress"  // "pending" | "in-progress" | "done"
});

// Validate before archiving — returns errors if docs/tests missing
const result = await mcp.rulebook_task_validate({
  taskId: "add-auth-system"
});
// result.valid === false → fix missing items before archive

await mcp.rulebook_task_archive({ taskId: "add-auth-system" });
// Fails if validate returns errors — fix first, then retry
```

## Skill Discovery Workflow

```typescript
await mcp.rulebook_skill_list({ category: "languages" });
await mcp.rulebook_skill_search({ query: "typescript strict" });
await mcp.rulebook_skill_enable({ skillId: "languages/typescript" });
await mcp.rulebook_skill_validate({});  // Check for conflicts
```

## Notes

- Stdout is reserved for JSON-RPC — all logs go to stderr
- The server auto-discovers `.rulebook` config by walking up directories
- See individual `rulebook-task-*` and `rulebook-skill-*` skills for detailed parameter schemas
