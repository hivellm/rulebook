# Proposal: phase3_budget-tests-and-ledger

## Why
context-budget.test.ts counts files Claude Code does not load (AGENTS.md) and misses what it does load; the P0 test now requires the delegation mandate; v7-budgets spawns node dist instead of the generated command; no hook-latency budget exists; the ledger stops at v7.0.2 (docs/analysis/multi-session-performance/04-context-and-orchestration.md F-029; 03 F-019).

## What Changes
- Budget counts what Claude Code injects (CLAUDE.md without comments, all always-on rules, listing lines, deferred names, per-prompt hook context); separate Codex budget.
- P0 restored: no generated text mandates or forbids delegation (explicit orchestrator mode excepted).
- Hook-latency test over the payload corpus (fast path ≥ 95 %); MCP test spawns the generated command.
- Ledger rows for v7.1–7.5 in docs/analysis/v7-performance/05-budget-and-metrics.md.

## Impact
- Affected specs: docs/analysis/multi-session-performance/08-execution-plan.md
- Affected code: tests/context-budget.test.ts, tests/v7-budgets.test.ts, scripts/measure-overhead.mjs, docs/analysis/v7-performance/05-budget-and-metrics.md
- Breaking change: NO
- User benefit: Performance regressions fail CI instead of reaching users.
