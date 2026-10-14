# Proposal: phase3_doctor-perf

## Why
Most per-call latency on this machine is on the same path as rulebook but not rulebook's (cortex hooks, project hooks, Codex plugin, broken global junction, npx chains, 9router style prompt), and nothing shows it today (docs/analysis/multi-session-performance/07-recommendations.md C8; 01 F-005, F-006; 05 F-034, F-038).

## What Changes
Read-only `rulebook doctor --perf`: every hook from user/project/local/plugin/Codex config with owner, matcher, blocking/async and p50/p90 from transcripts; CLI resolution (broken global junction); MCP launch form and live chains per host; stale PID files; leftover v5/v6 assets; AGENTS.override shadowing; hooks that always print {} (suggest async); hook timeouts. Never edits user settings.

## Impact
- Affected specs: docs/analysis/multi-session-performance/08-execution-plan.md
- Affected code: src/cli/commands/doctor*.ts (or misc.ts), src/core/quality/*, tests/doctor-perf.test.ts
- Breaking change: NO
- User benefit: Makes the not-rulebook costs visible and actionable.
