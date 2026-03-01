# Proposal: Fix Coverage Gate — Parse Real Coverage Instead of Hardcoded 95

## Problem

The coverage quality gate in `src/core/agent-manager.ts` (`checkCoverage()`) is hardcoded to always return 95% regardless of actual test run output. This means:

- Projects with 0% coverage always pass the coverage gate
- Coverage threshold from `rulebook.json` (`coverageThreshold`) is never actually enforced
- CI/CD quality gate is completely non-functional

## Root Cause

`checkCoverage()` returns a hardcoded literal `95` instead of parsing vitest/jest coverage output.

## Proposed Solution

Parse real coverage from test output:

```
vitest pattern:  "All files | XX.XX | ..."  (table format)
jest pattern:    "Lines: XX.XX%"
c8/nyc pattern:  "% Lines | XX.XX"
```

Algorithm:
1. Run test command with `--coverage` flag if not already present
2. Parse stdout for coverage table
3. Extract "All files" line percentage
4. Compare against `config.coverageThreshold`
5. If parsing fails, warn but don't fail (graceful degradation)

## Files to Modify

- `src/core/agent-manager.ts` — rewrite `checkCoverage()` with real parsing
- `src/agents/ralph-parser.ts` — add `parseCoveragePercentage(output: string): number | null`
- `tests/agent-manager.test.ts` — add tests with realistic vitest coverage output
