# Workspace Guide

> Multi-project management for monorepos and independent project folders.

## Overview

Rulebook workspace mode lets you manage multiple projects with a single MCP server, isolated per-project managers, and cross-project operations.

**Supported setups:**
- **Monorepo** — sub-folders in a single repo (pnpm, turbo, nx, lerna)
- **Independent folders** — separate repos or unrelated directories
- **VSCode multi-root** — `*.code-workspace` files

## Quick Start

```bash
# At the monorepo/workspace root
cd my-workspace

# Initialize (auto-detects monorepo structure)
rulebook workspace init

# Or manually add projects
rulebook workspace add ./frontend
rulebook workspace add ./backend
rulebook workspace add /path/to/shared-lib

# Setup MCP server for workspace mode
rulebook mcp init --workspace

# Update all projects at once
rulebook update
```

## Configuration

### .rulebook/workspace.json

Created inside `.rulebook/` by `rulebook workspace init`:

```json
{
  "name": "my-workspace",
  "version": "1.0.0",
  "projects": [
    { "name": "frontend", "path": "./frontend" },
    { "name": "backend", "path": "./backend" },
    { "name": "shared", "path": "/absolute/path/to/shared-lib" }
  ],
  "defaultProject": "backend",
  "idleTimeoutMs": 300000
}
```

| Field | Description |
|-------|-------------|
| `name` | Workspace display name |
| `projects[].name` | Unique project identifier (used as `projectId` in MCP) |
| `projects[].path` | Relative to workspace root, or absolute |
| `defaultProject` | Project used when `projectId` is omitted |
| `idleTimeoutMs` | Worker idle timeout before shutdown (default: 5 min) |

### Auto-Discovery

If no `.rulebook/workspace.json` exists, Rulebook discovers workspace from:

1. **`*.code-workspace`** — reads VSCode `folders[].path`
2. **`pnpm-workspace.yaml`** — scans `packages/`, `apps/`, `libs/`
3. **`turbo.json` / `nx.json` / `lerna.json`** — scans monorepo directories

## CLI Commands

### Workspace Management

```bash
rulebook workspace init          # Create .rulebook/workspace.json
rulebook workspace add <path>    # Add project to workspace
rulebook workspace remove <name> # Remove project by name
rulebook workspace list          # List all projects
rulebook workspace status        # Detailed status with task counts
```

### Task Commands with Project Targeting

```bash
# Auto-detects project from current directory
cd frontend && rulebook task list

# Explicit project targeting
rulebook task list --project frontend
rulebook task list --project backend --archived
rulebook task create my-task --project panel
rulebook task show my-task --project frontend
rulebook task validate my-task --project backend
rulebook task archive my-task --project panel

# All projects at once
rulebook task list --all-projects
```

### Update All Projects

```bash
# From anywhere inside the workspace
rulebook update
```

When workspace is detected, `rulebook update`:
1. Iterates all projects in the workspace
2. Runs full update on each (detect, generate AGENTS.md, update config)
3. Injects `WORKSPACE.md` spec into each project's `.rulebook/specs/`
4. Reports per-project success/failure

## MCP Server

### Setup

```bash
rulebook mcp init --workspace
```

Generates `.mcp.json` with `--workspace` flag:

```json
{
  "mcpServers": {
    "rulebook": {
      "command": "npx",
      "args": ["-y", "@hivehub/rulebook@latest", "mcp-server", "--workspace"]
    }
  }
}
```

### projectId Parameter

All 22 existing MCP tools accept an optional `projectId`:

```
rulebook_task_create({ taskId: "add-auth", projectId: "frontend" })
rulebook_task_list({ projectId: "backend" })
rulebook_memory_save({ title: "...", content: "...", projectId: "frontend" })
rulebook_memory_search({ query: "auth", projectId: "backend" })
```

**If `projectId` is omitted**, the `defaultProject` from workspace config is used.

### Workspace-Specific Tools

| Tool | Description |
|------|-------------|
| `rulebook_workspace_list` | List all projects with names and paths |
| `rulebook_workspace_status` | Active workers, task counts, config status |
| `rulebook_workspace_search` | Cross-project memory search (all projects) |
| `rulebook_workspace_tasks` | Tasks aggregated from all projects |

### Cross-Project Memory Search

```
rulebook_workspace_search({ query: "authentication", limit: 10 })
```

Returns results tagged by project:
```json
[
  { "project": "backend", "results": [...] },
  { "project": "frontend", "results": [...] }
]
```

## Architecture

### How It Works

```
┌─────────────────────────────────────────────┐
│        WorkspaceManager (1 process)         │
│  - Discovery: .rulebook/workspace.json       │
│  - Worker lifecycle: spawn/idle-kill        │
│  - MCP routing via projectId               │
└──────┬──────────┬──────────┬────────────────┘
       │          │          │
       v          v          v
  ┌─────────┐ ┌─────────┐ ┌─────────┐
  │ProjectW.│ │ProjectW.│ │ProjectW.│
  │backend  │ │frontend │ │ panel   │
  │         │ │         │ │         │
  │TaskMgr  │ │TaskMgr  │ │TaskMgr  │
  │MemoryMgr│ │MemoryMgr│ │MemoryMgr│
  │SkillsMgr│ │SkillsMgr│ │SkillsMgr│
  │ConfigMgr│ │ConfigMgr│ │ConfigMgr│
  └─────────┘ └─────────┘ └─────────┘
```

### Isolation

Each `ProjectWorker` is an **in-process instance** (NOT a child process) with completely isolated managers:

| Resource | Location | Shared? |
|----------|----------|---------|
| Tasks | `{project}/.rulebook/tasks/` | No |
| Memory DB | `{project}/.rulebook/memory.db` | No |
| Config | `{project}/.rulebook/rulebook.json` | No |
| Skills | resolved per `projectRoot` | No |
| AGENTS.md | `{project}/AGENTS.md` | No |

### Worker Lifecycle

1. **Spawn on-demand**: Worker created on first access to a project
2. **Lazy init**: MemoryManager only loads WASM when first queried
3. **Idle kill**: Workers shut down after `idleTimeoutMs` (default 5 min)
4. **Graceful shutdown**: SIGINT triggers `shutdownAll()` on all workers

### CLI Auto-Detection

When you run `rulebook task list` from inside a project directory:

1. `resolveProjectFromCwd()` walks up directories to find workspace config
2. Matches the current directory to a project in the workspace
3. Routes the command to that project's TaskManager
4. Falls back to single-project mode if no workspace found

## Migration from Single-Project

### Existing projects with `--project-root`

If you have `.mcp.json` files with absolute `--project-root` paths:

```json
// BEFORE (breaks on other machines):
{ "args": ["mcp-server", "--project-root", "/Users/me/code/frontend"] }
```

Migrate to workspace mode:

```bash
# 1. Create workspace config at the common root
cd /path/to/common-root
rulebook workspace init

# 2. Add your projects
rulebook workspace add ./frontend
rulebook workspace add ./backend

# 3. Switch MCP to workspace mode
rulebook mcp init --workspace

# 4. Remove old per-project .mcp.json files (optional)
```

### Legacy Migrator

Rulebook includes a legacy migrator that detects `.mcp.json` files with absolute `--project-root` paths and converts them to simplified args:

```bash
# Automatic during workspace init
rulebook workspace init  # detects and offers to migrate legacy configs
```

## Troubleshooting

### "No workspace found"

- Ensure `.rulebook/workspace.json` exists at the workspace root
- Or that a `*.code-workspace` / monorepo config (pnpm/turbo/nx) is present
- Run `rulebook workspace init` to create one

### "Project not found in workspace"

- Check project name with `rulebook workspace list`
- Names are case-sensitive and match the `name` field in config

### Memory mixing between projects

This **cannot happen**. Each project has its own `memory.db` at `{projectRoot}/.rulebook/memory.db`. They are separate SQLite files opened by separate `MemoryManager` instances.

### MCP tools not showing projectId

- Ensure the MCP server was started with `--workspace` flag
- Check `.mcp.json` includes `"--workspace"` in args
- Restart your editor after changing MCP config
