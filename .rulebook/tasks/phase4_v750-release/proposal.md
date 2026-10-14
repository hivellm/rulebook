# Proposal: phase4_v750-release

## Why
7.5.0 ships the performance changes from docs/analysis/multi-session-performance/07-recommendations.md; every phase metric must be re-measured the same way as in 00–05 before release.

## What Changes
- Re-run the hook harness, gate decomposition, MCP launch benchmark and token counts on the same projects.
- Update the budget ledger, CHANGELOG, version bump, full quality gate, release PR.

## Impact
- Affected specs: docs/analysis/multi-session-performance/08-execution-plan.md
- Affected code: CHANGELOG.md, package.json, docs/analysis/v7-performance/05-budget-and-metrics.md
- Breaking change: NO
- User benefit: Measured, documented release.
