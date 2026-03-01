# Proposal: Fix AgentManager Infinite Loop Bug

## Problem

`AgentManager.runAgentWorkflow()` in `src/core/agent-manager.ts` contains an unconditional `break` statement at the end of its main `for` loop, causing it to always exit after the first iteration regardless of task count or completion status. This means Ralph autonomous loop never actually iterates — it runs exactly once and stops.

Additionally, `checkCoverage()` is hardcoded to always return `95` instead of measuring real coverage output from test runs. This means the coverage quality gate never fails, giving false confidence in code quality.

## Root Cause

Two separate bugs in `src/core/agent-manager.ts`:

1. **Loop break bug**: The `for (const task of tasks)` loop has `break` at the bottom of the loop body unconditionally. Should only break on certain conditions (e.g., max iterations reached, paused state).

2. **Coverage hardcode bug**: `checkCoverage()` method returns `95` literal instead of parsing actual vitest/jest coverage output from `runResult.stdout`.

## Impact

- Ralph cannot solve more than one user story per run
- Coverage gate always shows green even when tests have 0% coverage
- All automated quality assurance for Ralph is effectively broken

## Proposed Fix

1. Remove unconditional `break` from agent workflow loop; add conditional breaks only for: paused state, fatal errors, max iterations exceeded.

2. Rewrite `checkCoverage()` to parse coverage output:
   - Look for patterns like `All files | XX.XX |` in vitest output
   - Look for `% Lines` in jest output
   - Fall back to configured threshold if parsing fails
   - Return actual measured percentage

## Files to Modify

- `src/core/agent-manager.ts` — fix loop break, fix checkCoverage()
- `tests/agent-manager.test.ts` — add test cases for multi-iteration behavior and coverage parsing
