# 07 — Execution Plan

Five phases, independently shippable, each measured against the budgets in
[05-budget-and-metrics.md](05-budget-and-metrics.md). Materialized as rulebook
tasks `phase1_v7-context-diet` … `phase5_v7-migration-benchmarks`, all
referencing `Source: docs/analysis/v7-performance/`.

**Measurement protocol (mandatory for every change)**: any change that alters
generated output runs `node scripts/measure-overhead.mjs` and appends its row to
the impact ledger in 05 before the task item is checked off. The final v7
performance report (phase 5, item 1.8) consolidates the ledger with per-change
deltas vs the v6.0.0 baseline.

## Phase 1 — Context diet

- Lean-only generators: CLAUDE.md ≤60 lines (draft 6.1), AGENTS.md <3 KB
  (draft 6.2); delete fat-mode generation paths.
- Collapse `.claude/rules/` 19 → 1 optional language file (draft 6.3).
- Remove every duplicated/contradictory directive listed in F-008.
- Update analysis directives to the numbered-by-theme standard (done on this
  branch: `templates/skills/dev/analysis/SKILL.md`, `.claude/commands/analysis.md`).

## Phase 2 — Hook teardown (P0 lands here)

- Delete generation of: Stop (handoff), UserPromptSubmit (terse), SessionStart ×4,
  **PreToolUse Agent (teams enforcement)**.
- Extend `LEGACY_SIGNATURES` in
  [claude-settings-manager.ts](../../../src/core/claude/claude-settings-manager.ts)
  so `rulebook update` strips all retired v6 hooks from existing projects.
- Rewrite the surviving Edit|Write guard as path-only (no node, no content
  regexes); move content rules (no-TODO/no-stub) to lint/pre-commit.
- Generate the full-autonomy permission profile (spec 4.6, draft 6.4): no
  permission prompts for routine operations; never tighten user settings.

## Phase 3 — MCP consolidation

- 26 → 8 action-parameterized tools (`rulebook_task`, `rulebook_memory`,
  `rulebook_session`, `rulebook_specs`, workspace variants).
- `.mcp.json` → slim entrypoint (`dist/mcp/rulebook-server.js`), lazy imports,
  no CLI dependencies in the server process; init < 150 ms.
- Task-format enforcement moves into `rulebook_task` creation (replaces the
  PreToolUse content regex).
- One-call `rulebook_session start` returning state + plans + knowledge digest.

## Phase 4 — Asset prune

- Agents: 0 installed by default; `rulebook agents add <role>` opt-in.
- Skills: keep Rulebook-specific only (task flows, analysis); delete generic
  engineering skills from default install.
- Workflows: opt-in via `rulebook workflows add`.
- Delete handoff/terse/teams-enforcement/token-tier subsystems and their
  templates, hooks, and skills.

## Phase 5 — Migration + docs + benchmarks

- `rulebook update` v6→v7 path with `--dry-run` and diff summary (spec 4.7).
- CI acceptance checks from 05 (token budget, hook audit, MCP schema budget,
  orchestration-freedom test, startup benchmark).
- README, CHANGELOG, migration guide; before/after numbers published.
