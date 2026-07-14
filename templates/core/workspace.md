<!-- RULEBOOK:START -->
# Workspace Mode

This project is part of a multi-project workspace managed by Rulebook.

## Project routing

Rulebook MCP tools route automatically: pass any file `path` you are working
on and the server resolves the owning project by longest-prefix match; without
a hint, calls target the default project (`{{DEFAULT_PROJECT}}`). An explicit
`projectId` always wins as an override.

```
rulebook_task({ action: "create", taskId: "phase1_add-auth", path: "/repo/frontend/src/App.tsx" })
# → routed to project "frontend"
```

Cross-project views: `rulebook_workspace` (action: list | status | tasks).

## Workspace Projects

{{WORKSPACE_PROJECTS}}

## Conventions

1. Capture cross-project knowledge once, in the project that owns the code;
   reference it from the others.
2. Each project has its own `.rulebook/` — configs, tasks, knowledge, and
   decisions are fully isolated.

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
