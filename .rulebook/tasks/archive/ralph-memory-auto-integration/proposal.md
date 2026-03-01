# Proposal: Ralph → Memory Auto-Integration

## Problem

Ralph records learnings from each iteration in `.rulebook/ralph/history/iteration-N.json` but never saves them to the memory system. This means:

1. Learnings are isolated per-run and not searchable across sessions
2. When Ralph resumes after a break, it has no access to previous insights
3. The memory system exists but is unused by the autonomous loop
4. Future Ralph runs repeat mistakes already learned in past runs

## Solution

After each Ralph iteration completes, automatically save key data to the memory system:

1. **Iteration learnings** → `type: "learning"` with tags `["ralph", "iteration", story-id]`
2. **Quality gate failures** → `type: "bug"` with error context
3. **Successful patterns** → `type: "decision"` with what worked
4. **Story completion** → `type: "observation"` with completion summary

At the start of each Ralph run, search memory for:
- Previous learnings for the current project
- Known failure patterns to avoid
- Successful approaches to replicate

## Files to Modify

- `src/core/ralph-manager.ts` — add `saveIterationToMemory()` call after each iteration
- `src/core/iteration-tracker.ts` — expose structured learning data for memory saving
- `src/mcp/rulebook-server.ts` — ensure memory tools are accessible to ralph-manager
- `tests/ralph-memory.test.ts` — new test file for memory integration
