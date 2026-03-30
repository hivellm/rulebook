# Proposal: Human-in-the-Loop Planning Checkpoint for Ralph

## Why

To let humans review and approve Ralph's implementation plan before code is generated, reducing wasted iterations.

## Context

Ralph currently runs fully autonomously without human review between iterations. For complex tasks this can lead to:
- AI going down wrong implementation paths for multiple iterations
- Compounding errors that become harder to fix
- Lack of human oversight on architectural decisions

The planning checkpoint feature adds an optional review gate before Ralph starts implementing a story.

## Solution

Add a `--plan-first` mode to Ralph where:

1. Before executing each user story, Ralph generates a **plan** using the AI tool
2. Ralph outputs the plan to the terminal and waits for human approval
3. Human types `approve`, `reject <reason>`, or `edit <feedback>`
4. Only after approval does Ralph proceed with implementation
5. Rejection with reason is added to the story context for next iteration

This is similar to Claude Code's plan mode (`/plan`) but integrated into Ralph's autonomous loop.

## New Ralph Config

```json
"ralph": {
  "planCheckpoint": {
    "enabled": false,
    "autoApproveAfterSeconds": 0,
    "requireOnFirstIteration": true
  }
}
```

## Files to Modify

- `src/core/ralph-manager.ts` — add planning phase before implementation
- `src/cli/commands.ts` — add `--plan-first` flag to `ralph run`
- `src/core/config-manager.ts` — add planCheckpoint config
- `src/types.ts` — add PlanCheckpointConfig type
- `tests/ralph-plan-checkpoint.test.ts` — new test file
