---
name: rulebook-task
description: Manage spec-driven tasks for features and breaking changes
---

Manage Rulebook tasks using the OpenSpec-compatible format.

## Commands

```bash
# Create a new task
rulebook task create <task-id>

# List all tasks
rulebook task list

# Show task details
rulebook task show <task-id>

# Validate task structure
rulebook task validate <task-id>

# Archive completed task
rulebook task archive <task-id>
```

## Task Structure

Each task creates the following structure:

```
rulebook/tasks/<task-id>/
├── proposal.md         # Why and what changes
├── tasks.md            # Implementation checklist
├── design.md           # Technical design (optional)
└── specs/
    └── <module>/
        └── spec.md     # Technical specifications
```

## Workflow

1. Create task: `rulebook task create my-feature`
2. Write proposal.md explaining why and what
3. Write tasks.md with simple checklist items
4. Write specs in specs/<module>/spec.md
5. Validate: `rulebook task validate my-feature`
6. Implement following the spec
7. Archive: `rulebook task archive my-feature`
