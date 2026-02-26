<!-- RALPH:START -->
# Ralph Autonomous Loop Integration

Ralph is an autonomous AI agent loop that iteratively solves tasks with fresh context for each iteration. This document explains how to use Ralph with your Rulebook project.

## Overview

Ralph enables:
- **Autonomous Multi-Iteration Development**: AI agents solve tasks across multiple iterations
- **Quality Gates**: Automatic checks for type-safety, linting, testing, and coverage
- **Progress Tracking**: Detailed history of each iteration with metrics and learnings
- **Fresh Context per Iteration**: Each iteration starts with clean context, avoiding context window exhaustion
- **Graceful Interruption**: Pause and resume capabilities for long-running tasks

## Quick Start

### Initialize Ralph
```bash
rulebook ralph init
```
This creates:
- `.rulebook/ralph/prd.json` - Product Requirements Document from rulebook tasks
- `.rulebook/ralph/state.json` - Current loop state and progress
- `.rulebook/ralph/history/` - Per-iteration metadata and results

### Run Ralph Loop
```bash
rulebook ralph run --max-iterations 10 --tool claude
```
Flags:
- `--max-iterations N` - Maximum iterations before stopping (default: 10)
- `--tool TOOL` - AI tool to use: `claude`, `amp`, or `gemini` (default: claude)

### Check Status
```bash
rulebook ralph status
```
Shows:
- Current iteration count
- Completed vs. pending tasks
- Success rate and quality metrics

### View History
```bash
rulebook ralph history --limit 5
```
Displays:
- Last 5 iterations with status and duration
- Task completions and failures
- Quality gate results

### Pause/Resume
```bash
rulebook ralph pause    # Gracefully pause the loop
rulebook ralph resume   # Continue from where it paused
```

## How Ralph Works

### Iteration Loop
```
┌─────────────────────────────────────────┐
│ 1. Load Next Pending Task from PRD      │
├─────────────────────────────────────────┤
│ 2. Execute Agent with Task Context      │
│    - Fresh context per iteration        │
│    - Task description and acceptance    │
│      criteria from rulebook             │
│    - Previous iteration learnings       │
├─────────────────────────────────────────┤
│ 3. Parse Agent Output                   │
│    - Extract quality gate results       │
│    - Extract learnings and errors       │
│    - Extract git commit hash            │
├─────────────────────────────────────────┤
│ 4. Record Iteration Results             │
│    - Save to history/.iteration-N.json  │
│    - Update task status in PRD          │
│    - Log progress to progress.txt       │
├─────────────────────────────────────────┤
│ 5. Check Loop Continuation              │
│    - All tasks completed?    → Stop     │
│    - Max iterations reached? → Stop     │
│    - Otherwise              → Loop      │
└─────────────────────────────────────────┘
```

### Quality Gates
Ralph automatically checks these gates after each iteration:

| Gate | Description | Pass Criteria |
|------|-------------|---------------|
| **type-check** | TypeScript compilation | No errors |
| **lint** | ESLint code quality | No errors |
| **tests** | Unit tests | All passing |
| **coverage** | Code coverage | ≥95% |

**Iteration Status:**
- ✅ **success** - All 4 gates pass
- ⚠️ **partial** - 2-3 gates pass
- ❌ **failed** - 0-1 gates pass

### Fresh Context Strategy
Each iteration provides context to the agent:
1. **Task Description** - What to implement
2. **Acceptance Criteria** - How to verify success
3. **Quality Requirements** - Type-check, lint, tests, coverage
4. **Previous Learnings** - Lessons from prior iterations
5. **Project Context** - Recent git commits, file structure
6. **Git Status** - Current diff and uncommitted changes

This allows agents to make progress without exhausting context window.

## Task Sizing for Ralph

### Good Task Sizes
✅ **Small Tasks** (1-2 iterations)
- Add single feature (button, form field)
- Fix localized bug
- Refactor single function/component
- Add utility function

Example:
```markdown
## Task: Add Dark Mode Toggle

What Changes: Add UI toggle for theme switching

Acceptance Criteria:
- [ ] Toggle button visible in settings
- [ ] Click toggles theme immediately
- [ ] Selection persists in localStorage
- [ ] All tests passing
```

✅ **Medium Tasks** (3-5 iterations)
- Implement new API endpoint
- Refactor component with dependencies
- Add authentication system
- Build complex feature with multiple parts

Example:
```markdown
## Task: Implement User Authentication

What Changes: Add JWT-based user auth

Acceptance Criteria:
- [ ] Login endpoint working
- [ ] Token generation and validation
- [ ] Protected routes enforced
- [ ] Refresh token rotation
- [ ] Error handling comprehensive
```

### Poor Task Sizes
❌ **Too Large** (>5 iterations)
- Build entire new module
- Major architectural redesign
- Complete feature system

→ Break into smaller, focused tasks

❌ **Too Vague** (unclear acceptance criteria)
- "Improve performance"
- "Make code better"
- "Add tests"

→ Define specific, measurable criteria

## Configuration

### .rulebook File
```json
{
  "ralph": {
    "enabled": true,
    "maxIterations": 10,
    "tool": "claude",
    "maxContextLoss": 3
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Enable Ralph features |
| `maxIterations` | `10` | Max iterations per run |
| `tool` | `claude` | Default AI tool |
| `maxContextLoss` | `3` | Allow 3 context loss events before stopping |

## MCP Integration

Ralph provides 4 MCP tools for programmatic access:

### rulebook_ralph_init
Initialize Ralph and generate PRD from tasks
```json
{
  "type": "resource",
  "name": "rulebook_ralph_init",
  "description": "Initialize Ralph autonomous loop"
}
```

### rulebook_ralph_run
Execute autonomous iteration loop
```json
{
  "type": "resource",
  "name": "rulebook_ralph_run",
  "description": "Run Ralph iteration loop"
}
```

### rulebook_ralph_status
Get current loop state and progress
```json
{
  "type": "resource",
  "name": "rulebook_ralph_status",
  "description": "Get Ralph loop status"
}
```

### rulebook_ralph_get_iteration_history
Retrieve iteration metadata and statistics
```json
{
  "type": "resource",
  "name": "rulebook_ralph_get_iteration_history",
  "description": "Get Ralph iteration history"
}
```

## Directory Structure

Ralph stores all data in `.rulebook/ralph/`:
```
.rulebook/ralph/
├── prd.json              # Product Requirements Document
├── state.json            # Current loop state
├── progress.txt          # Append-only progress log
└── history/
    ├── iteration-1.json  # Metadata from iteration 1
    ├── iteration-2.json  # Metadata from iteration 2
    └── ...
```

### prd.json Structure
```json
{
  "version": "1.0",
  "generated_at": "2026-02-26T12:00:00Z",
  "project_name": "my-project",
  "total_tasks": 5,
  "tasks": [
    {
      "id": "task-1",
      "title": "Task Title",
      "description": "Task description",
      "status": "pending|in_iteration|completed|blocked",
      "priority": 1,
      "acceptance_criteria": ["Criterion 1", "Criterion 2"],
      "estimated_iterations": 2,
      "created_at": "2026-02-26T12:00:00Z",
      "updated_at": "2026-02-26T12:00:00Z"
    }
  ]
}
```

### iteration-N.json Structure
```json
{
  "iteration": 1,
  "started_at": "2026-02-26T12:00:00Z",
  "completed_at": "2026-02-26T12:05:00Z",
  "task_id": "task-1",
  "task_title": "Task Title",
  "duration_ms": 300000,
  "status": "success|partial|failed",
  "git_commit": "abc1234",
  "quality_checks": {
    "type_check": true,
    "lint": true,
    "tests": true,
    "coverage_met": true
  }
}
```

## Best Practices

### 1. Clear Acceptance Criteria
❌ Bad: "Make it work"
✅ Good: "User can click button and see modal dialog with form"

### 2. Limit to 1 Task per Run
Run Ralph on single focused task for best results
```bash
# Focus on one task at a time
rulebook ralph run --max-iterations 5
```

### 3. Review Iteration Results
Check quality gates and learnings between runs
```bash
rulebook ralph history --limit 1  # See latest iteration
```

### 4. Break Large Features
Don't try to implement entire systems in one run
- Task 1: API endpoint with basic validation
- Task 2: Database models and migrations
- Task 3: Error handling and edge cases
- Task 4: Tests and documentation

### 5. Inspect Failed Iterations
If status is "failed", examine what went wrong:
```bash
cat .rulebook/ralph/history/iteration-N.json
cat .rulebook/ralph/progress.txt
```

### 6. Use Learnings from History
Ralph extracts and stores learnings from iterations. Review these to understand what strategies worked.

## Troubleshooting

### Iteration Loop Stops Early
**Cause**: Hit max iterations or all tasks completed

**Solution**:
- Check status: `rulebook ralph status`
- View history: `rulebook ralph history`
- Increase max iterations: `rulebook ralph run --max-iterations 20`

### Quality Gates Failing
**Cause**: Type-check, lint, tests, or coverage not meeting standards

**Solution**:
- Review failing gate in iteration history
- Check PRD acceptance criteria match quality gates
- Ensure task is small enough for single iteration

### Context Loss Events
**Cause**: Agent ran out of context window during iteration

**Solution**:
- Break task into smaller pieces
- Reduce task description complexity
- Increase agent context window if possible

### Ralph State Gets Stuck
**Cause**: Invalid state.json or corrupted PRD

**Solution**:
```bash
rm .rulebook/ralph/state.json      # Reset state
rulebook ralph init                # Regenerate PRD
rulebook ralph run                 # Restart loop
```

## Examples

### Example 1: Simple Feature Implementation
Task: Add dark mode toggle button

```bash
# Initialize Ralph
rulebook ralph init

# Run for up to 3 iterations
rulebook ralph run --max-iterations 3

# Check results
rulebook ralph history

# Review final output
cat .rulebook/ralph/history/iteration-*.json
```

### Example 2: Multiple Task Execution
Tasks: Several small features to implement

```bash
# Run multiple tasks with generous iteration limit
rulebook ralph run --max-iterations 20

# Monitor progress
watch -n 5 'rulebook ralph status'

# Pause if needed
rulebook ralph pause

# Review and resume
rulebook ralph history
rulebook ralph resume
```

### Example 3: Debugging Failed Iteration
```bash
# Run into failure
rulebook ralph run --max-iterations 3

# See what failed
cat .rulebook/ralph/history/iteration-3.json

# View full progress log
tail -50 .rulebook/ralph/progress.txt

# Manual fix and resume
rulebook ralph resume
```

## Limitations

- **Single Sequential Loop**: Ralph processes one task at a time sequentially
- **No Parallel Execution**: Tasks don't run in parallel (by design)
- **No Task Dependencies**: No automatic dependency resolution between tasks
- **Manual Task Ordering**: You order tasks by priority in PRD

## Related Documentation

- See `/rulebook/specs/RULEBOOK.md` for task structure
- See `/rulebook/specs/QUALITY_ENFORCEMENT.md` for quality gates
- See `/rulebook/AGENTS.md` for AI agent integration

<!-- RALPH:END -->
