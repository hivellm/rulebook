<!-- RULEBOOK:START -->
# Workspace Mode

**This project is part of a multi-project workspace managed by Rulebook.**

## CRITICAL: Project Routing

When calling ANY Rulebook MCP tool, you MUST pass the `projectId` parameter to target the correct project.

### How to determine the current project

1. **Check which files you are editing** — the file path tells you which project you are in
2. **Use `rulebook_workspace_list`** to see all available projects and their paths
3. **Match the file path to a project path** to determine the `projectId`

### Examples

```
# You are editing files in /path/to/frontend/src/App.tsx
# → projectId = "frontend"

rulebook_task_create({ taskId: "add-auth", projectId: "frontend" })
rulebook_task_list({ projectId: "frontend" })
rulebook_memory_save({ ..., projectId: "frontend" })
rulebook_memory_search({ query: "auth", projectId: "frontend" })
```

### Cross-project operations

Use these dedicated workspace tools for operations across ALL projects:

- `rulebook_workspace_list` — List all projects in the workspace
- `rulebook_workspace_status` — Status of each project (active workers, task count)
- `rulebook_workspace_search` — Search memory across ALL projects at once
- `rulebook_workspace_tasks` — List tasks from ALL projects at once

### Default project

If you omit `projectId`, the **default project** is used: `{{DEFAULT_PROJECT}}`.
Only omit `projectId` when you are certain the operation targets the default project.

## Workspace Projects

{{WORKSPACE_PROJECTS}}

## Rules

1. **NEVER save memory to the wrong project** — always verify `projectId` before calling `rulebook_memory_save`
2. **NEVER create tasks in the wrong project** — check which project the feature belongs to
3. **When working across projects** (e.g., shared types), save memory to BOTH relevant projects
4. **Use `rulebook_workspace_search`** to find related context across all projects before starting work
5. **Each project has its own `.rulebook/`** directory — configs, tasks, and memory are fully isolated

## CLI Commands

```bash
# List tasks from a specific project
rulebook task list --project frontend

# List tasks from ALL projects
rulebook task list --all-projects

# Create task in specific project
rulebook task create my-task --project backend

# Update all projects at once
rulebook update
```
<!-- RULEBOOK:END -->
