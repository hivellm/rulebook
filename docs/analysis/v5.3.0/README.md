# Rulebook v5.3.0 — Analysis & Planning

> Release planning document. Analysis only — no source changes.
> Date: 2026-04-07 · Branch target: `release/v5.3.0`

## Index

| # | File | Topic |
|---|------|-------|
| 01 | [01-projects.md](./01-projects.md) | Real-world project analyses (tml, project-v, UzEngine) |
| 02 | [02-papers.md](./02-papers.md) | Insights from `llm-ir-debugging` papers |
| 03 | [03-claude-md-strategy.md](./03-claude-md-strategy.md) | CLAUDE.md `@import` strategy per Anthropic docs |
| 04 | [04-features.md](./04-features.md) | Proposed v5.3.0 features (F1–F10 + F-NEW-1..5) |
| 05 | [05-tml-hooks.md](./05-tml-hooks.md) | TML hooks for Teams & post-compaction (F-NEW-1, F-NEW-2) |
| 06 | [06-task-tail.md](./06-task-tail.md) | Mandatory task tail: docs + tests + verify (F-NEW-3) |
| 07 | [07-analysis-workflow.md](./07-analysis-workflow.md) | `/analysis <topic>` command + skill (F-NEW-4) |
| 08 | [08-migration.md](./08-migration.md) | Migration path for existing v5.2.x projects |
| 09 | [09-open-questions.md](./09-open-questions.md) | Open questions requiring user decision |
| 10 | [10-session-handoff.md](./10-session-handoff.md) | Session handoff & freshness manager (F-NEW-5) |
| — | [appendix.md](./appendix.md) | Source references |

## Executive summary

Rulebook v5.3.0 shifts from "generate one big AGENTS.md and a big CLAUDE.md per project" to **a modular, import-driven CLAUDE.md strategy aligned with Anthropic's official memory model**. It absorbs concrete lessons from three real HiveLLM projects (tml, project-v, UzEngine) and from the LLM-IR-debugging paper.

### P0 features (must ship)

1. **F1 — Generic CLAUDE.md + `@import` chain.** Regenerated safely on every `rulebook update`; project state lives in imported files. Aligns with [Anthropic memory docs](https://code.claude.com/docs/en/memory#claude-md-imports). Validated against tml's 1021-line violation. → [03](./03-claude-md-strategy.md), [04 §F1](./04-features.md)
2. **F2 — `.claude/rules/` first-class generation with `paths:` frontmatter.** All three projects already hand-maintain this; rulebook is lagging actual practice. → [04 §F2](./04-features.md)
3. **F-NEW-1 — Built-in Agent-team enforcement hook.** Promoted from TML production hook. Forces background parallel agents through Teams. → [05 §B.1](./05-tml-hooks.md)
4. **F-NEW-2 — `COMPACT_CONTEXT.md` + SessionStart re-injection hook.** Closes the post-compaction context gap within a session. → [05 §B.2](./05-tml-hooks.md)
5. **F-NEW-3 — Mandatory docs+tests+verify tail on every task.** Structural enforcement: tasks cannot be archived without docs, tests, and a passing run. → [06](./06-task-tail.md)
6. **F-NEW-4 — `/analysis <topic>` command + skill.** Repeatable research workflow that scaffolds `docs/analysis/<slug>/`, dispatches agents, produces numbered findings, generates an execution plan, materializes tasks, and writes findings to the knowledge base. → [07](./07-analysis-workflow.md)
7. **F-NEW-5 — Session handoff & freshness manager.** Stop hook monitors context size, forces `/handoff` skill above threshold, SessionStart hook auto-restores the next fresh session. Extension-free; one keystroke (`/clear`) of residual user friction. → [10](./10-session-handoff.md)

### P1 / P2 features

P1: STATE.md auto-regen (F3), diagnostic-first directive (F4), fail-twice-escalate rule (F5), CLAUDE.local.md bootstrap (F6).
P2: `rulebook doctor` size budgeter (F7), Multi-agent module (F8), MCP tool reference autogen (F9), opt-in MCP telemetry (F10).

Full table: [04-features.md § Priority summary](./04-features.md#priority-summary).

## Session continuity stack (F-NEW-2 + F3 + F-NEW-5 combined)

| Layer | Mechanism | Lifetime |
|---|---|---|
| Per-turn state | `STATE.md` (machine, F3) + `PLANS.md` (human) | Within session |
| Post-compaction | `COMPACT_CONTEXT.md` reinject hook (F-NEW-2) | Within session, post-compact |
| Cross-session | `/handoff` skill + `_pending.md` + resume hook (F-NEW-5) | Between sessions |

## Top recommendations

- **Adopt Anthropic's official `@import` model**: regenerate a thin (<150 line) generic CLAUDE.md on every `rulebook update` that imports `AGENTS.md`, `AGENTS.override.md`, `.rulebook/STATE.md`, `.rulebook/PLANS.md`. tml's 1021-line CLAUDE.md is a concrete violation of the 200-line guidance.
- **Promote `.claude/rules/` to a first-class artifact** with auto-generated per-language files using `paths:` frontmatter — all three analyzed projects already do this by hand.
- **Codify paper findings as built-in rules**: `diagnostic-first.md` (+3x adoption per paper §5) and `fail-twice-escalate.md` (UzEngine RULE -3 in the wild).
- **Never clobber user-owned files**: `AGENTS.override.md`, `CLAUDE.local.md`, `.claude/agents/`, `.claude/hooks/`, and non-sentinel `.claude/rules/*.md` must be preserved on update.
- **Auto-manage `.rulebook/STATE.md`** as a machine-written ~40-line session state file imported by CLAUDE.md, driven by task/Ralph hooks.
- **Close the cross-session gap with F-NEW-5**: monitor context, force handoff, auto-restore — the only manual step is the user typing `/clear`.
