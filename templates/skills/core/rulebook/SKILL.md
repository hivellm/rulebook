---
name: "Rulebook Task Management"
description: "Spec-driven task management for features and breaking changes with OpenSpec-compatible format"
version: "1.0.0"
category: "core"
author: "Rulebook"
tags: ["task-management", "openspec", "spec-driven", "workflow"]
dependencies: []
conflicts: []
---

# Rulebook Task Management

**CRITICAL**: Use Rulebook's built-in task management system for spec-driven development of new features and breaking changes.

## When to Use

Create tasks for:
- New features/capabilities
- Breaking changes
- Architecture changes
- Performance/security work

Skip for:
- Bug fixes (restore intended behavior)
- Typos, formatting, comments
- Dependency updates (non-breaking)

## Task Creation is MANDATORY Before Implementation

**ABSOLUTE RULE**: You MUST create a task BEFORE implementing ANY feature.

### MANDATORY Workflow

**NEVER start implementation without creating a task first:**

```bash
# WRONG: Starting implementation directly
# ... writing code without task ...

# CORRECT: Create task first
rulebook task create <task-id>
# Write proposal.md
# Write tasks.md
# Write spec deltas
rulebook task validate <task-id>
# NOW you can start implementation
```

### Task Creation Steps

**When a feature is requested:**

1. **STOP** - Do not start coding
2. **Create task** - `rulebook task create <task-id>`
3. **Plan** - Write proposal.md and tasks.md
4. **Spec** - Write spec deltas
5. **Validate** - `rulebook task validate <task-id>`
6. **THEN** - Start implementation

## Task Directory Structure

```
rulebook/tasks/<task-id>/
├── proposal.md         # Why and what changes
├── tasks.md            # Implementation checklist
├── design.md           # Technical design (optional)
└── specs/
    └── <module>/
        └── spec.md     # Technical specifications
```

## Task Commands

```bash
# Create new task
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

## Proposal Format (proposal.md)

```markdown
# Proposal: <Task Title>

## Why
<Explain the problem or opportunity>

## What Changes
<List of changes with ADDED/MODIFIED/REMOVED markers>

## Impact
- Affected specs: <list spec files>
- Affected code: <list source files>
- Breaking change: YES/NO
- User benefit: <describe benefit>
```

## Tasks Format (tasks.md)

**CRITICAL**: Only simple checklist items. Technical details go in specs.

```markdown
## 1. <Phase Name>
- [ ] 1.1 <Simple task description>
- [ ] 1.2 <Simple task description>

## 2. <Phase Name>
- [ ] 2.1 <Simple task description>
```

## Spec Delta Format (specs/<module>/spec.md)

```markdown
# <Module> Specification

## ADDED Requirements

### Requirement: <Name>
<Description>

#### Scenario: <Name>
Given <context>
When <action>
Then <expected result>

## MODIFIED Requirements

### Requirement: <Original Name>
<Description of modification>

## REMOVED Requirements

### Requirement: <Name to Remove>
<Reason for removal>
```

## MCP Integration

If MCP server is enabled, use programmatic task management:

```typescript
// Create task
await mcp.rulebook_task_create({ taskId: "my-task" });

// List tasks
await mcp.rulebook_task_list({});

// Show task
await mcp.rulebook_task_show({ taskId: "my-task" });

// Validate task
await mcp.rulebook_task_validate({ taskId: "my-task" });

// Archive task
await mcp.rulebook_task_archive({ taskId: "my-task" });
```

## Best Practices

1. **Always create task first** - Never implement without documentation
2. **Keep tasks.md simple** - Only checklist items, no explanations
3. **Put details in specs** - Technical requirements go in spec files
4. **Validate before implementing** - Run `rulebook task validate`
5. **Archive when done** - Move completed tasks to archive
