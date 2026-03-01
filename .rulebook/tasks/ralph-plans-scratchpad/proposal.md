# Proposal: PLANS.md Session Scratchpad Pattern

## Context

The PLANS.md pattern (also called "session scratchpad") has emerged as a top-tier context engineering technique for AI agents. It works as follows:

1. At the start of each AI session, the agent reads `PLANS.md` for current task context
2. During the session, the agent updates `PLANS.md` with decisions, discoveries, and progress
3. At the end of the session, the agent writes a summary to `PLANS.md`
4. This creates **persistent session continuity** without relying on conversation history

This is particularly valuable for Ralph — each iteration can read the scratchpad to understand what was tried before and what approaches to avoid.

## Solution

1. **Generate `PLANS.md`** during `rulebook init` with structured template:
   ```markdown
   # Project Plans & Session Context

   ## Active Context
   <!-- PLANS:CONTEXT:START -->
   <!-- PLANS:CONTEXT:END -->

   ## Session History
   <!-- PLANS:HISTORY:START -->
   <!-- PLANS:HISTORY:END -->
   ```

2. **Ralph integration**: inject `PLANS.md` content into Ralph iteration prompt
3. **Update on iteration end**: append iteration summary to PLANS.md history
4. **CLI command**: `rulebook plans show` / `rulebook plans clear`

## Files to Modify

- `templates/core/PLANS.md` — new template
- `src/core/generator.ts` — generate PLANS.md during init
- `src/core/ralph-manager.ts` — read/write PLANS.md per iteration
- `src/cli/commands.ts` — add `plans` subcommand
- `src/index.ts` — register plans command
- `tests/plans-scratchpad.test.ts` — new test file
