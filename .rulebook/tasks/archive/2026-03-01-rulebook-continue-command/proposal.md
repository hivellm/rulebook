# Proposal: `rulebook continue` — Session Continuity Command

## Why

To standardize AI project setup with consistent, scalable patterns.

## Context

When an AI session ends (context limit, restart, new conversation), the agent loses all context about what was being worked on. Users must manually explain the situation again.

The `rulebook continue` command generates a structured context summary that can be pasted at the start of a new AI session, instantly restoring context without manual explanation.

## What It Does

`rulebook continue` aggregates context from multiple sources:

1. **PLANS.md** — active context and current task from session scratchpad
2. **Active tasks** — pending checklist items from `.rulebook/tasks/*/tasks.md`
3. **Recent git commits** — last 8 commits via `git log --oneline`
4. **Ralph status** — current iteration, story progress, tool (if Ralph is running)
5. **Current branch** — from `git rev-parse --abbrev-ref HEAD`

Output is a formatted markdown block ready to paste in a new session.

## Design

- Reads all sources without modifying project state
- Appends a history entry to PLANS.md if it exists
- Gracefully handles missing sources (no git, no Ralph, no tasks)
- Works in any project with or without rulebook configured
- Output goes to stdout (can be piped or redirected)

## Files Modified/Created

- `src/core/plans-manager.ts` — new module (session scratchpad)
- `src/cli/commands.ts` — `continueCommand()` + plans commands
- `src/index.ts` — register `continue` and `plans` commands
- `templates/core/PLANS.md` — template file
