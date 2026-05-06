# Proposal: phase2_remove-health-scorer

## Why

`src/core/health-scorer.ts` (~440 LOC) computes a project "health score"
from coverage, lint, test pass-rate, and code-quality heuristics. It is
exposed only through `rulebook doctor health` (one branch in
`src/cli/commands/misc.ts`) and feeds nothing else: no decisions, no
gating, no MCP tool. The score is computed, printed, and discarded.

Real CI/quality signal in this project comes from the standard pipeline
(type-check + lint + tests + coverage threshold), which `rulebook doctor
run` already orchestrates. The scorer duplicates that work with a fuzzier
metric and no actionable output.

## What Changes

- Delete `src/core/health-scorer.ts`.
- Remove the `health` subcommand from `src/cli/commands/misc.ts` (or
  wherever the `doctor health` branch lives) and clean up the help text.
- If `rulebook doctor run` exposes a "health summary" line that calls into
  the scorer, replace it with the simpler counts already produced by
  `doctor run` (lint warnings, type errors, failing tests).
- Delete the corresponding test file(s) under `tests/health-scorer*.test.ts`.

## Impact

- Affected specs: none (the scorer is not in any spec).
- Affected code:
  - Deleted: `src/core/health-scorer.ts`
  - Modified: `src/cli/commands/misc.ts`, `src/core/doctor.ts` (if it
    references the scorer), CLI help generators
  - Tests removed: `tests/health-scorer*.test.ts`
- Breaking change: minor — `rulebook doctor health` stops existing.
  Document in CHANGELOG.
- User benefit: ~440 LOC removed; one less duplicated quality heuristic
  to maintain.
