# Proposal: F7 — `rulebook doctor` size + drift budgeter

Source: [docs/analysis/v5.3.0/04-features.md#f7](../../../docs/analysis/v5.3.0/04-features.md)

## Why
No one notices when CLAUDE.md crosses 200 lines (tml is at 1021). No one notices when `AGENTS.override.md` conflicts with `AGENTS.md`. A `rulebook doctor` subcommand surfaces these silent drift problems.

## What Changes
- New `src/core/doctor.ts` with checks: file sizes vs Anthropic budgets, orphaned rules, conflicting directives between AGENTS.md and override, stale STATE.md (>14d), broken `@imports`.
- New CLI subcommand `rulebook doctor` (or extend existing `validate`).
- Optional MCP tool `rulebook_doctor_run`.
- Auto-runs after `rulebook update` (post-update report).

## Impact
- Affected specs: none
- Affected code: new `src/core/doctor.ts`, `src/cli/commands.ts`, `src/mcp/rulebook-server.ts`
- Breaking change: NO
- User benefit: silent drift becomes visible
