# 04 — Proposed v5.3.0 Features

Each block: Problem → Solution → Files to change → MCP impact → Tests → Priority.

P0 features additionally documented in their own files:
- **F-NEW-1** Team-enforcement hook → see [05-tml-hooks.md §B.1](./05-tml-hooks.md#b1-enforce_team_for_background_agentssh-pretooluse-on-agent)
- **F-NEW-2** COMPACT_CONTEXT.md + reinject hook → see [05-tml-hooks.md §B.2](./05-tml-hooks.md#b2-on-compact-reinjectsh-sessionstart-matcher-compact)
- **F-NEW-3** Mandatory task tail → see [06-task-tail.md](./06-task-tail.md)
- **F-NEW-4** `/analysis <topic>` workflow → see [07-analysis-workflow.md](./07-analysis-workflow.md)

## F1 — Generic CLAUDE.md with `@import` chain  — P0
- **Problem:** Current CLAUDE.md is a mix of generic + project-specific content. tml's is 1021 lines, UzEngine's is 355, violating Anthropic's 200-line guidance.
- **Solution:** New `templates/core/CLAUDE_MD_v2.md` (the ~120-line template in [03-claude-md-strategy.md §3.4](./03-claude-md-strategy.md#34-the-generic-claudemd-template-proposed)). New `src/core/claude-md-generator.ts` that renders imports based on detected files.
- **Files:** `templates/core/CLAUDE_MD_v2.md` (new), `src/core/claude-md-generator.ts` (new), `src/core/generator.ts` (route CLAUDE.md generation through new module), `src/core/merger.ts` (RULEBOOK:START/END preservation logic for CLAUDE.md).
- **MCP impact:** None directly. `rulebook_task_update` should dirty-flag `.rulebook/STATE.md` to trigger regen on next update.
- **Tests:** `tests/claude-md-generator.test.ts` — generation, merger preservation, import resolution, backwards-compat with v5.2 CLAUDE.md files.
- **Priority:** P0.

## F2 — First-class `.claude/rules/` generation with `paths:` frontmatter  — P0
- **Problem:** Rulebook only knows about AGENTS.md. Projects hand-maintain `.claude/rules/` (evidence: all 3 projects have it).
- **Solution:** Detector scans detected languages/frameworks → emits `.claude/rules/<lang>.md` with YAML `paths:` frontmatter scoped to that language's globs.
- **Files:** `templates/rules/` (new directory with `rust.md`, `typescript.md`, `cpp.md`, `python.md`, …), `src/core/rules-generator.ts` (new), wire into `commands.ts init/update`.
- **MCP impact:** New `rulebook_rules_list` returns generated + user rules with source attribution. (Tool already exists — extend response.)
- **Tests:** `tests/rules-generator.test.ts`.
- **Priority:** P0.

## F3 — `.rulebook/STATE.md` auto-regeneration  — P1
- **Problem:** tml has a hand-maintained STATE.md; project-v has none. Session continuity is broken.
- **Solution:** `src/core/state-writer.ts` renders a short (<40 line) STATE.md on every task state change. Includes active task, phase, last iteration, health score.
- **Files:** `src/core/state-writer.ts` (new), hook into `task-manager.ts` update/archive, `ralph-manager.ts` iteration end.
- **MCP impact:** Every task MCP mutation triggers a STATE.md rewrite.
- **Tests:** `tests/state-writer.test.ts`.
- **Priority:** P1.

## F4 — Diagnostic-first directive injector  — P1
- **Problem:** Paper finding #2 — LLMs skip `check` before `test`; a single prompt rule raises adoption 3x.
- **Solution:** `templates/rules/diagnostic-first.md` with the check-before-test rule + quantitative justification ("this raised adoption 8.8% → 25.3% in 10 days per [cite]"). Auto-inject when a type-checker is detected (tsc, mypy, cargo check, rustc, cmake, etc.).
- **Files:** `templates/rules/diagnostic-first.md` (new), detector integration.
- **MCP impact:** None.
- **Tests:** Detection tests for each language.
- **Priority:** P1.

## F5 — Fail-twice-escalate rule  — P1
- **Problem:** UzEngine's RULE -3 and the paper both document the "keeps guessing" failure mode.
- **Solution:** Ship `templates/rules/fail-twice-escalate.md` as a generic rule. Auto-enabled.
- **Files:** `templates/rules/fail-twice-escalate.md` (new).
- **MCP impact:** None.
- **Tests:** Generation test.
- **Priority:** P1.

## F6 — `CLAUDE.local.md` bootstrap + `.gitignore` hygiene  — P1
- **Problem:** Rulebook currently doesn't know about `CLAUDE.local.md`. Users manually manage it and often commit it by accident.
- **Solution:** `rulebook init` writes a commented `CLAUDE.local.md` stub and ensures `.gitignore` contains `CLAUDE.local.md` and `.rulebook/backup/`.
- **Files:** `src/cli/commands.ts` init flow, `src/utils/gitignore.ts` (new or extend existing).
- **MCP impact:** None.
- **Tests:** init flow tests.
- **Priority:** P1.

## F7 — `rulebook doctor` size + drift budgeter  — P2
- **Problem:** No one notices when CLAUDE.md crosses 200 lines (tml is at 1021). No one notices when AGENTS.override.md conflicts with AGENTS.md.
- **Solution:** New `rulebook doctor` subcommand (or extension of existing `validate`) that reports: file sizes vs Anthropic budgets, orphaned rules, conflicting directives between AGENTS.md and override, stale STATE.md (>14d), broken `@imports`.
- **Files:** `src/core/doctor.ts` (new), `src/cli/commands.ts` registration.
- **MCP impact:** Optional `rulebook_doctor_run` tool.
- **Tests:** `tests/doctor.test.ts`.
- **Priority:** P2.

## F8 — Multi-agent / Teams opt-in module  — P2
- **Problem:** tml has ~6 KB of policy on Teams usage; UzEngine has 30+ sub-agents. Rulebook ignores both.
- **Solution:** `templates/core/MULTI_AGENT.md` + detector trigger (presence of `.claude/agents/` with ≥3 files, or explicit config flag). Pairs with F-NEW-1 hook.
- **Files:** `templates/core/MULTI_AGENT.md` (new), detector rule.
- **MCP impact:** None.
- **Tests:** Detection test.
- **Priority:** P2.

## F9 — MCP tool reference auto-generation  — P2
- **Problem:** Agents waste cycles spawning sub-agents for tasks a direct MCP tool handles (tml CLAUDE.md block "Check Skills and MCP Tools BEFORE Spawning Agents" is evidence).
- **Solution:** On update, walk `.mcp.json` / `.cursor/mcp.json` and emit `.claude/rules/mcp-tool-reference.md` listing discovered tools with one-line summaries.
- **Files:** `src/core/mcp-reference-generator.ts` (new).
- **MCP impact:** Reads MCP config only.
- **Tests:** Generation test with fixture MCP configs.
- **Priority:** P2.

## F10 — Opt-in MCP telemetry (paper-style)  — P2
- **Problem:** No project can reproduce the IR-debugging paper's analysis on itself.
- **Solution:** Opt-in `--telemetry` flag on `rulebook mcp init` writes to `.rulebook/telemetry/YYYY-MM-DD.ndjson`. Gitignored. Zero cost when off.
- **Files:** `src/mcp/rulebook-server.ts` middleware, `src/core/telemetry.ts` (new).
- **MCP impact:** Tool-call count per tool, latency, success/fail. **Never** records arguments or content.
- **Tests:** Privacy tests (no argument leakage), opt-in default-off.
- **Priority:** P2.

## Priority summary

| ID | Title | Priority |
|---|---|---|
| F-NEW-1 | Team-enforcement Agent hook | **P0** |
| F-NEW-2 | COMPACT_CONTEXT + reinject hook | **P0** |
| F-NEW-3 | Mandatory task tail (docs+tests+verify) | **P0** |
| F-NEW-4 | `/analysis <topic>` workflow | **P0** |
| F1 | Generic CLAUDE.md + @import chain | **P0** |
| F2 | `.claude/rules/` first-class generation | **P0** |
| F3 | `.rulebook/STATE.md` auto-regen | P1 |
| F4 | Diagnostic-first directive | P1 |
| F5 | Fail-twice-escalate rule | P1 |
| F6 | `CLAUDE.local.md` bootstrap | P1 |
| F7 | `rulebook doctor` budgeter | P2 |
| F8 | Multi-agent / Teams module | P2 |
| F9 | MCP tool reference autogen | P2 |
| F10 | Opt-in MCP telemetry | P2 |
