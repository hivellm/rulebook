# Proposal: Fix RalphParser False Negatives in Quality Gate Detection

## Problem

`RalphParser` in `src/agents/ralph-parser.ts` incorrectly marks quality checks as failed when output contains words like "error" as substrings of other words. For example:

- `"0 errors found"` → detected as failure (contains "error")
- `"No lint errors"` → detected as failure
- `"0 test errors"` → detected as failure

This causes valid passing runs to be marked as failed, preventing Ralph from completing user stories even when all quality gates actually pass.

## Root Cause

The regex or string matching for error detection uses simple substring matching (`includes('error')`) rather than checking for actual error counts > 0 or structured failure patterns.

## Impact

- Ralph marks successful iterations as failed
- User stories never get marked `passes: true` even when all quality gates pass
- Loop runs until max_iterations unnecessarily
- False learnings get recorded (recording "lint failed" when lint passed)

## Proposed Fix

Replace naive substring matching with structured detection:

1. **Type-check**: Parse `error TS` count — fail only if count > 0
2. **Lint**: Parse ESLint `X problems (Y errors, Z warnings)` — fail only if errors > 0
3. **Tests**: Parse `X failed` — fail only if count > 0; "0 errors" = success
4. **Coverage**: Use percentage threshold comparison, not string matching

Add comprehensive test cases for all edge cases.

## Files to Modify

- `src/agents/ralph-parser.ts` — fix all quality gate detection patterns
- `tests/ralph-parser.test.ts` — add tests for "0 errors", "no errors", edge cases
