# Proposal: phase2_orchestration-by-judgment

## Why
v7.4's "delegate every task, including small ones" makes 1–5-edit requests cost 65 vs 11 model calls and 12.9 vs 4.1 min, a one-line fix 10–12 turns, and 3 of 7 v7.4 projects already override it by hand (docs/analysis/multi-session-performance/04-context-and-orchestration.md F-020..F-025, F-031; 07 C1, C2). Blocked on operator decision Q1 (default) and Q5 (replay A/B).

## What Changes
- Config `orchestration: "judgment" | "orchestrator"`; default per Q1.
- Always-on text with reasons and visible criteria (files already in context, ~3 or fewer files → direct; ≥ 2 independent parts, broad exploration, long work, main context > ~150 k → delegate). Delegation is for context protection and parallelism, not speed.
- Close-out: CHANGELOG per PR/release, archive only tracked tasks, full diff review once per PR, targeted tests per subagent, full gate before commit batch and push.
- Hand-back format (outcome, files, checks, risks) and one progress line per dispatch and hand-back.
- update respects the setting and never overwrites user orchestration text.

## Impact
- Affected specs: docs/analysis/multi-session-performance/08-execution-plan.md
- Affected code: templates/core/claude-md.md, templates/core/orchestration.md, templates/core/agents-lean.md, src/core/generators/*, src/types.ts, src/core/state/config-manager.ts, tests/context-budget.test.ts
- Breaking change: NO (behaviour of generated text changes; stated in CHANGELOG)
- User benefit: Small requests toward 11–16 calls / 4–7 min p50 (to be confirmed by the replay A/B, not promised).
