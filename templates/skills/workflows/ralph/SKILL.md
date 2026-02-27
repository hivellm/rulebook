---
name: "Ralph Autonomous Loop"
description: "Autonomous AI agent loop for iterative task implementation (@hivehub/rulebook ralph)"
version: "1.0.0"
category: "workflow"
author: "Rulebook"
tags: ["autonomous", "ralph", "iterative", "workflow"]
dependencies: ["rulebook"]
conflicts: []
---
<!-- RALPH:START -->
# Ralph Autonomous Loop Skill

**Purpose**: Automate iterative feature implementation using Ralph's autonomous agent loop pattern.

## Installation

Ralph is installed as part of @hivehub/rulebook:

```bash
npm install -g @hivehub/rulebook
# or
npx @hivehub/rulebook init
```

## Quick Start

### Step 1: Initialize Ralph for Your Project

```bash
# Create task specifications in .rulebook/tasks/
rulebook task create my-feature

# Initialize Ralph
rulebook ralph init

# This creates:
# - .rulebook-ralph/prd.json (task specifications in PRD format)
# - .rulebook-ralph/progress.txt (learning log across iterations)
# - .rulebook-ralph/history/ (per-iteration metadata)
```

### Step 2: Run Autonomous Loop

```bash
# Run with default settings
rulebook ralph run

# Or with custom iterations and tool
rulebook ralph run --max-iterations 10 --tool claude
```

### Step 3: Monitor Progress

```bash
# Check current status
rulebook ralph status

# View iteration history
rulebook ralph history

# See learnings discovered
rulebook ralph history --learnings
```

## Understanding the Ralph Loop

### Loop Workflow

```
1. Pick highest-priority incomplete task from PRD
2. Execute AI agent (Claude Code, Cursor, or Gemini)
   - Provide full PRD context
   - Include progress.txt (learnings from past iterations)
   - Include git history (recent commits)
3. Run quality gates (type-check, lint, tests)
4. If success:
   - Commit changes with iteration metadata
   - Update task status to completed
   - Record learnings to progress.txt
5. If failure:
   - Mark task as blocked
   - Record error and blockers to progress.txt
6. Repeat until all tasks completed or max iterations reached
```

### Fresh Context Per Iteration

Each iteration starts fresh:
- New AI agent instance (clean context)
- Memory persists through: git commits, PRD.json, progress.txt
- AI agent reads past learnings to avoid repeating mistakes

This pattern prevents "context degradation" where AI agent loses track of architectural decisions across many iterations.

## Configuration

### .rulebook Configuration

```json
{
  "ralph": {
    "enabled": false,
    "maxIterations": 10,
    "tool": "claude",
    "maxContextLoss": 3
  }
}
```

**Options**:
- `enabled`: Enable Ralph autonomous loop (default: false)
- `maxIterations`: Max iterations before stopping (default: 10)
- `tool`: AI CLI tool to use (default: "claude")
  - `"claude"` — Claude Code CLI
  - `"amp"` — Amp CLI (for Cursor)
  - `"gemini"` — Gemini CLI
- `maxContextLoss`: Tolerance for incomplete agent outputs (default: 3)

### PRD Format (.rulebook-ralph/prd.json)

```json
{
  "tasks": [
    {
      "id": "task-id",
      "title": "Task Title",
      "description": "What needs to be done",
      "priority": 1,
      "status": "pending",
      "acceptanceCriteria": [
        "Criterion 1",
        "Criterion 2"
      ],
      "estimatedComplexity": "medium"
    }
  ]
}
```

### Progress Log (.rulebook-ralph/progress.txt)

Append-only learning log:

```
=== Iteration 1 ===
Task: implement-auth
Tool: Claude Code
Result: SUCCESS
Learnings:
- Discovered OAuth token refresh pattern (30-min expiry)
- Gotcha: Tokens expire silently, need header check before retry
- Pattern: Use interceptor middleware for transparent refresh

=== Iteration 2 ===
Task: add-caching
Tool: Claude Code
Result: FAILED - Tests failed
Error: Cache invalidation not handling concurrent updates
Blockers: Need to implement distributed cache locking
```

## Usage Patterns

### Pattern 1: Progressive Feature Implementation

Break large features into tasks:

```bash
# Create tasks for phases
rulebook task create setup-database
rulebook task create create-api-endpoints
rulebook task create add-authentication
rulebook task create write-tests

# Initialize Ralph
rulebook ralph init

# Run autonomous loop — implements all tasks iteratively
rulebook ralph run --max-iterations 20
```

### Pattern 2: Learning Across Iterations

Ralph learns from past iterations:

1. **Iteration 1**: Implements feature A, discovers pattern X
2. **Progress.txt updated**: Records pattern X
3. **Iteration 2**: Reads progress.txt, applies pattern X to feature B
4. **Iteration 3+**: Builds on discovered patterns

### Pattern 3: Pause and Resume

Stop loop gracefully and resume later:

```bash
# Start autonomous loop
rulebook ralph run --max-iterations 100

# (User presses Ctrl+C)
# Loop pauses, state saved

# Resume later
rulebook ralph resume

# Continues from last incomplete task with full history
```

## Quality Gates

Ralph enforces quality checks after each iteration:

```bash
# After each implementation, Ralph runs:
npm run type-check    # TypeScript compilation
npm run lint          # ESLint (0 warnings)
npm run test          # All tests (100% pass)
npm run test:coverage # Coverage threshold met (95%)
```

**If ANY gate fails**:
- Task marked as `blocked` with error details
- Error recorded to progress.txt
- Loop continues to next task (unless `--strict` mode)

## MCP Integration

Use Ralph via Model Context Protocol:

```javascript
// Initialize Ralph
rulebook_ralph_init({ force: false })
  → Returns: { success: true, taskCount: 5, prdPath: "..." }

// Start autonomous loop
rulebook_ralph_run({ maxIterations: 10, tool: "claude" })
  → Returns: { success: true, loopId: "loop-123", status: "running" }

// Query loop status
rulebook_ralph_status()
  → Returns: { loopStatus: "running", iteration: 5, currentTask: "task-id", ... }

// Get iteration history
rulebook_ralph_get_iteration_history({ limit: 10 })
  → Returns: { iterations: [...], total: 12 }
```

## Best Practices

### DO ✅

- **Break features into right-sized tasks**: 1-2 context windows each
- **Write clear acceptance criteria**: AI uses these to validate completion
- **Monitor iteration history**: Review learnings and errors
- **Run manual testing**: Ralph is automated but human review is important
- **Commit frequently**: Each iteration commits, creating audit trail
- **Use meaningful task IDs**: Descriptive names help AI understand context

### DON'T ❌

- **Don't create huge tasks**: "Build entire backend" won't fit in one iteration
- **Don't skip acceptance criteria**: AI needs clear completion signals
- **Don't ignore blocked tasks**: Review errors and adjust task sizing
- **Don't run without version control**: You need git history for learning
- **Don't disable quality gates**: Tests catch failures early

## Troubleshooting

### Loop Stops Early

**Problem**: Ralph stops before reaching max iterations
**Cause**: All tasks completed (success!) or multiple blockers
**Solution**: Check `rulebook ralph history` for blockers

### Same Task Keeps Failing

**Problem**: Task marked blocked multiple times
**Cause**: Task too large, acceptance criteria unclear, or AI context insufficient
**Solution**:
1. Break task into smaller subtasks
2. Clarify acceptance criteria
3. Add examples to task spec

### Quality Gates Failing

**Problem**: Type-check, lint, or tests fail after implementation
**Cause**: AI-generated code doesn't meet project standards
**Solution**:
1. Review error details in progress.txt
2. Update AGENTS.md with clearer standards
3. Provide more examples in task specs

## Next Steps

1. **Create tasks**: `rulebook task create <task-id>` (multiple times)
2. **Initialize Ralph**: `rulebook ralph init`
3. **Run loop**: `rulebook ralph run --max-iterations N`
4. **Monitor**: `rulebook ralph status` and `rulebook ralph history`
5. **Review**: Check generated code and learnings
6. **Deploy**: Code is committed and ready

## References

- **Ralph Pattern**: https://github.com/snarktank/ralph
- **Task Management**: See `RULEBOOK.md` in AGENTS.md
- **Rulebook CLI**: `rulebook --help`
- **MCP Server**: `rulebook-mcp` (stdio transport)

<!-- RALPH:END -->
