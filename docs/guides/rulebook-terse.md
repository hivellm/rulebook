# Rulebook Terse — User Guide

Output-verbosity compression for AI coding agents. Cuts response tokens ~40-70% without losing technical accuracy.

**Status**: phase 0 of 6 (foundations). Skill files, spec, and smoke-test eval harness land in v5.4.0-pre. Hooks, CLI, CI integration, and release land in subsequent phases.

## What it does

Rulebook Terse makes the agent speak less — drops filler, hedging, pleasantries, and unnecessary articles — while keeping all technical substance, code, file paths, errors, and commands exactly intact. Four intensity levels let you dial compression to match task complexity and agent tier.

## Intensity levels

| Level | When to use | Behavior |
|-------|-------------|----------|
| `off` | Complex bugs, architecture work, domain-critical reasoning (Core tier / opus). | No compression. Full prose welcome. |
| `brief` | Implementation, tests, feature work (Standard tier / sonnet). | Drop filler + hedging + pleasantries. Professional but tight. |
| `terse` | Read-only exploration, research, doc lookups (Research tier / haiku). | Drop articles. Fragments OK. Short synonyms. |
| `ultra` | CI / non-interactive automation. | Abbreviate, arrows for causality, one word when enough. |

Default intensity resolves from: `RULEBOOK_TERSE_MODE` env → `.rulebook/rulebook.json` `terse.defaultMode` → active agent tier → `brief`.

## Activation

| Surface | Example |
|---------|---------|
| Slash command | `/rulebook-terse`, `/rulebook-terse brief\|terse\|ultra\|off` |
| Natural language (on) | "be terse", "less tokens please", "terse mode", "activate rulebook-terse" |
| Natural language (off) | "normal mode", "stop terse", "disable terse" |
| Automatic | SessionStart hook injects based on tier (ships in phase 2) |

## Sub-skills

- **`/rulebook-terse-commit`** — Conventional Commits with ≤50 char subject, body only when needed. Independent of base mode.
- **`/rulebook-terse-review`** — One-line PR review comments in `L<line>: <severity> <problem>. <fix>.` format. Independent of base mode.

## Auto-clarity (the safety rule)

Compression is **always dropped** for:

1. Security warnings (CVE-class, credential exposure, permission elevation).
2. Destructive operations (`rm -rf`, `git reset --hard`, `DROP TABLE`, `rulebook_task_delete`).
3. Quality-gate failures (type-check, lint, tests, coverage < 95%).
4. Multi-step sequences where fragment ambiguity risks misread.
5. User says they didn't understand or repeats the same question.

After the clear part ends, compression resumes on the next turn.

## Where the files live

| File | Purpose |
|------|---------|
| `templates/skills/core/rulebook-terse/SKILL.md` | Base skill — source of truth for behavior. |
| `templates/skills/core/rulebook-terse-commit/SKILL.md` | Commit sub-skill. |
| `templates/skills/core/rulebook-terse-review/SKILL.md` | Review sub-skill. |
| `.rulebook/specs/RULEBOOK_TERSE.md` | Project-level spec (intensity contract, auto-clarity, boundaries). |
| `evals/` | Three-arm evaluation harness (`baseline` / `terse` / `rulebook-terse`). |
| `docs/analysis/caveman/` | Research analysis the design is grounded in. |

## Evaluation

All behavior changes are measured against a three-arm harness: `baseline` (no system prompt), `terse` (`Answer concisely.`), and `rulebook-terse` (`Answer concisely.` + SKILL.md).

The honest delta reported is **`rulebook-terse` vs `terse`** — not vs `baseline`. Comparing to baseline would conflate the skill with generic brevity-asking.

Run the current smoke test:

```bash
npx tsx evals/measure.ts
```

Phase 4 replaces byte counts with `tiktoken` and wires a PR-comment bot.

## Related

- **Input-side compression**: `rulebook compress <file>` (ships in phase 3) compresses memory files the agent reads (`CLAUDE.md`, `AGENTS.override.md`, knowledge base).
- **Safety primitives**: `safe-flag-io` module (ships in phase 2) protects flag-file reads and writes from symlink-based local attacks.
- **Research basis**: `docs/analysis/caveman/` — full analysis of the JuliusBrussee/caveman project whose patterns this feature adopts.

## Roadmap

| Phase | Task | Status |
|-------|------|--------|
| 0 | Foundations (specs, SKILL.md drafts, smoke-test harness) | **In progress** |
| 1 | Skill family + template wiring | Pending |
| 2 | TS hooks (SessionStart, UserPromptSubmit) + `safe-flag-io` | Pending |
| 3 | `rulebook compress` CLI + MCP tools | Pending |
| 4 | Full three-arm harness + CI integration | Pending |
| 5 | Rule-sync CI fan-out to agent-specific rule locations | Pending |
| 6 | v5.4.0 release | Pending |
