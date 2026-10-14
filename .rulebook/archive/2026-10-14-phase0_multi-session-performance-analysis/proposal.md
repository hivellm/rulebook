# Proposal: phase0_multi-session-performance-analysis

## Why
The operator runs several Claude Code and Codex sessions at once, all on rulebook projects, and
reports severe slowness on both sides. Measurements on 2026-10-14 show rulebook v7.4 adds ~1 s per
prompt (Jev prompt hook: bash + full CLI load + TypeSafe call), 130–160 ms per Bash/Edit/Write call
(two bash guards), a 4-process `npx @latest` MCP chain per session (13 alive at once, ≈1.3 GB) and a
mandatory-delegation directive that multiplies turns on small tasks; 64 % of Jev routings end in
"ask the operator". The next version (7.5.0, branch `release/v7.5.0`) must remove this overhead.

## What Changes
Analysis only (no product code in this task). Deliverables in `docs/analysis/multi-session-performance/`:
`00` raw orchestrator measurements, `01–05` measured findings (hooks, Jev gate, MCP lifecycle,
context + orchestration + session forensics, Codex/9router side), `06` external model panel
(Codex gpt-6-astra, gpt-6.1-sol, grok-4.6, kimi-k3 via the local 9router, Claude Opus 5.5),
`07` recommendations, `08` execution plan, `README.md` index + decisions needed. The execution plan
is then materialized as `phase1_…`/`phase2_…` rulebook tasks for v7.5.0.

## Impact
- Affected specs: `.rulebook/specs/orchestration.md` (follow-up tasks), `.rulebook/specs/rulebook.md`
- Affected code: none in this task; follow-up tasks touch `src/cli/commands/hook.ts`, `src/core/typesafe/*`,
  `src/core/claude/claude-settings-manager.ts`, `src/core/claude/claude-mcp.ts`, `templates/hooks/*`,
  `src/mcp/rulebook-server.ts`, generated `CLAUDE.md`/`AGENTS.md`
- Breaking change: NO (analysis)
- User benefit: a measured, model-reviewed plan that makes every session on rulebook faster
  (per-prompt, per-tool-call, per-session memory/process count, fewer operator round trips)
