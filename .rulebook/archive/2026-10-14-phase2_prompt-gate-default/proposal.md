# Proposal: phase2_prompt-gate-default

## Why
With the fixes in phase1_prompt-gate-fixes the gate still adds a classifier round trip per prompt whose routing the model mostly ignores; v7.0 removed the per-prompt hook for this reason (docs/analysis/multi-session-performance/02-jev-gate.md F-011, F-012; 07 C3). Blocked on operator decision Q2.

## What Changes
- `gate.promptHook.enabled` default per Q2 (recommended: false).
- Remove "Gate first" and the manual rulebook_gate fallback from the always-on text; rulebook_gate stays as an on-demand tool.

## Impact
- Affected specs: docs/analysis/multi-session-performance/08-execution-plan.md
- Affected code: src/core/typesafe/prompt-hook.ts, src/core/claude/typesafe-integration.ts, templates/core/claude-md.md, templates/core/orchestration.md, .claude/rules/typesafe.md template
- Breaking change: NO
- User benefit: 0 ms per prompt by default; no 8–16 s stalls; no manual gate calls (+2 turns each).
