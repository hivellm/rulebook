# Proposal: phase9_session-bounds

Source: GitHub issue #21 (external v7-perf audit)

## Why

session start returns the whole PLANS.md and end appends forever — the
session-start payload grows monotonically with project age (100 sessions =
100 summaries into context on call one). plans.md template still MANDATES the
start/end ritual v7 made optional.

## What Changes

- start returns PLANS:CONTEXT + PLANS:TASK blocks + last 3 history entries
  (plus tasks + learnings as today).
- end keeps at most 20 history entries; older rotate to
  .rulebook/archive/plans-history.md.
- plans.md template reworded to optional-scratchpad semantics.

## Impact

- Affected code: v7-tools.ts, templates/core/plans.md, tests
- Breaking change: NO (payload shape keeps keys; content bounded)
- User benefit: constant-cost session start forever
