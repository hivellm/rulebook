---
name: rulebook-mcp
description: MCP server overview and integration guide. Use this for setup, configuration, and discovering available MCP tools for task and skill management.
version: "2.0.0"
category: core
author: "HiveLLM"
tags: ["mcp", "model-context-protocol", "server", "integration", "overview"]
dependencies: []
conflicts: []
---

# Rulebook MCP Server

The Rulebook MCP server exposes 13 tools for programmatic task and skill management via the Model Context Protocol (stdio transport, JSON-RPC 2.0).

## Setup

```bash
rulebook mcp init
```

## Starting the Server

```bash
rulebook-mcp
```

## Available Tools

### Task Management (7 tools)

| Tool | Description | Skill Reference |
|------|-------------|-----------------|
| `rulebook_task_create` | Create a new task with directory structure | See `rulebook-task-create` skill |
| `rulebook_task_list` | List tasks with status filtering | See `rulebook-task-list` skill |
| `rulebook_task_show` | Show complete task details | See `rulebook-task-show` skill |
| `rulebook_task_update` | Update task status | See `rulebook-task-update` skill |
| `rulebook_task_validate` | Validate task format | See `rulebook-task-validate` skill |
| `rulebook_task_archive` | Archive completed task | See `rulebook-task-archive` skill |
| `rulebook_task_delete` | Permanently delete task | See `rulebook-task-delete` skill |

### Skill Management (6 tools)

| Tool | Description | Skill Reference |
|------|-------------|-----------------|
| `rulebook_skill_list` | List available skills by category | See `rulebook-skill-list` skill |
| `rulebook_skill_show` | Show skill details and content | See `rulebook-skill-show` skill |
| `rulebook_skill_enable` | Enable a skill in project config | See `rulebook-skill-enable` skill |
| `rulebook_skill_disable` | Disable a skill | See `rulebook-skill-disable` skill |
| `rulebook_skill_search` | Search skills by query | See `rulebook-skill-search` skill |
| `rulebook_skill_validate` | Validate skills configuration | See `rulebook-skill-validate` skill |

## Quick Examples

```typescript
// Task workflow
await mcp.rulebook_task_create({ taskId: "add-auth-system" });
await mcp.rulebook_task_update({ taskId: "add-auth-system", status: "in-progress" });
await mcp.rulebook_task_show({ taskId: "add-auth-system" });
await mcp.rulebook_task_validate({ taskId: "add-auth-system" });
await mcp.rulebook_task_archive({ taskId: "add-auth-system" });

// Skill workflow
await mcp.rulebook_skill_list({ category: "languages" });
await mcp.rulebook_skill_search({ query: "typescript" });
await mcp.rulebook_skill_enable({ skillId: "languages/typescript" });
await mcp.rulebook_skill_validate({});
```

## MCP Configuration

For Cursor (`.cursor/mcp.json`):
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

For Claude Code (`.claude/mcp.json`):
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

## Notes

- The server uses **stdio transport** — stdout is reserved for JSON-RPC messages only
- All logs go to stderr (use `RULEBOOK_MCP_DEBUG=1` for debug output)
- The server auto-discovers the `.rulebook` config by walking up directories
- For detailed input schemas, error handling, and usage of each tool, refer to the individual tool skills listed above
