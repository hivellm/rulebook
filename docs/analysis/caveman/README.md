# Caveman — Project Analysis

**Date**: 2026-04-20
**Source**: https://github.com/JuliusBrussee/caveman
**Commit analyzed**: `main` @ 2026-04-18
**Author**: Claude Opus 4.7 (automated analysis)

## TL;DR

Caveman is a **cross-agent prompt skill** that compresses LLM output by ~65–75% via a stylistic constraint (“talk like smart caveman”), while preserving technical substance. It ships as a Claude Code plugin, Codex plugin, Gemini extension, and rule files for Cursor/Windsurf/Cline/Copilot plus 40+ agents via `npx skills`. It is one of the most-starred Claude Code skills on GitHub (≈40k stars, ≈2k forks, ≈120 open issues as of analysis date).

The repository is **not primarily a code project** — it is a **distribution system for a small set of Markdown skill files** plus the hooks, CI, and evaluation harness needed to ship them to every major AI coding agent from a single source of truth.

## Reports

| # | Report | Description |
|---|--------|-------------|
| 1 | [01-architecture.md](01-architecture.md) | Repo layout, single-source-of-truth strategy, CI sync, Claude Code hook system, flag-file state, symlink-safe writes |
| 2 | [02-skill-design.md](02-skill-design.md) | The skill itself: intensity levels, auto-clarity rule, boundaries, sub-skills (commit / review / help / compress), activation triggers |
| 3 | [03-evaluation.md](03-evaluation.md) | Three-arm eval harness (baseline / terse / skill), benchmarks against the real Claude API, and why the “terse vs skill” delta is the honest number |
| 4 | [04-findings-for-rulebook.md](04-findings-for-rulebook.md) | Patterns, anti-patterns, and specific learnings applicable to Rulebook’s own skill/agent distribution system |
| 5 | [05-rulebook-adoption-proposal.md](05-rulebook-adoption-proposal.md) | Concrete proposal for **Rulebook v5.4.0** — what to adopt, what to skip, phased implementation plan, risks, acceptance criteria |
| 6 | [06-hook-deep-dive.md](06-hook-deep-dive.md) | **Deep dive on the output-reduction mechanism** — exact code flow of Caveman's two hooks, the `safeWriteFlag`/`readFlag` security primitives, and a concrete TS implementation plan for Rulebook with file-by-file changes |

## Project snapshot

| Metric | Value |
|---|---|
| Language | Python (primary), JavaScript (hooks), Shell/PowerShell (install) |
| License | MIT |
| Stars / Forks | ≈40,008 / ≈2,011 |
| Created | 2026-04-04 |
| Last push | 2026-04-18 |
| Size on disk | ≈2.3 MB |
| Homepage | https://getcaveman.dev/ |
| Ecosystem siblings | `cavemem` (memory), `cavekit` (spec-driven build) |

## Top 5 findings (detail in report 4)

1. **One source, many emitters.** `skills/caveman/SKILL.md` + `rules/caveman-activate.md` are the only files humans edit. A GitHub Actions workflow fans them out to 9+ agent-specific locations (`.cursor/`, `.windsurf/`, `.clinerules/`, `.github/copilot-instructions.md`, `plugins/caveman/`, `caveman.skill` zip, etc.). This is the pattern Rulebook needs when it starts shipping to agents beyond Claude Code.
2. **Hidden SessionStart injection beats user-visible preambles.** Claude Code hook stdout is *silently* injected as system context — users never see the caveman ruleset get loaded. Per-turn reinforcement via `UserPromptSubmit` prevents style drift when other plugins inject competing instructions.
3. **Auto-clarity is the key safety rule.** The skill drops compression for security warnings, destructive-op confirmations, and confused users. Without this, the compression would produce unsafe output. Any stylistic directive in Rulebook should carry an equivalent escape clause.
4. **Evaluate against *terse*, not baseline.** Caveman’s eval harness has three arms: `baseline` (no system prompt), `terse` (`Answer concisely.`), `skill` (the actual SKILL.md). The honest measurement is **skill vs terse**, not skill vs baseline — comparing to baseline conflates the skill with generic terseness. Rulebook’s benchmarks should adopt the same three-arm structure.
5. **Silent-fail hooks.** Every filesystem operation in hooks is wrapped so that a broken hook never blocks session start. `safeWriteFlag()` uses `O_NOFOLLOW` + atomic temp-and-rename + `0600` perms to prevent symlink-clobber attacks on the predictable flag path. Rulebook’s hooks inherit none of these protections today.

## How Rulebook should read this analysis

- Start with **report 1** if evaluating distribution strategy for Rulebook’s cross-agent support.
- Start with **report 2** if designing a new skill or stylistic directive.
- Start with **report 3** if designing evaluation or benchmarking infrastructure.
- **Report 4** is the actionable output: concrete patterns to adopt and anti-patterns to avoid.
- **Report 5** is the v5.4.0 shipping plan: deliverables, phases, acceptance criteria, quick-win ordering.

Tags: `analysis:caveman`, `skill-design`, `cross-agent-distribution`, `claude-code-hooks`, `evaluation-methodology`, `prompt-engineering`, `token-optimization`.
