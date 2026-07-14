# 03 — v7.0.0 Design Principles

> **Mission**: run *complementary* to Opus and Fable — an assistant to the model,
> never an anchor. Rulebook v7 states project *facts and values*; it does not
> script the model's *process*. Enforcement is structural only where it is cheap
> and high-precision. Everything else is trust + verification.

## P0 — Never block native orchestration

Frontier models dispatch parallel subagents as a core working style — Fable
routinely fans out background agents for independent sub-tasks. v6 actively
*denies* this (`enforce-team-for-background-agents.sh` rejects any background
Agent call without `team_name`) and micromanages it (mandatory delegation table,
"never implement in the main conversation"). Every denial is a wasted turn; every
mandate overrides a decision the model makes better on its own.

In v7, **no hook, rule, or table may deny or mandate how the model uses
subagents, parallelism, or teams.** Orchestration guidance is at most one
advisory line.

## P1 — Trust the model

No forced delegation, no sequential-editing mandates, no decomposition protocols,
no handoff rituals, no verbosity tiers. Frontier models do these natively and
better.

## P2 — Facts over procedures

The ideal CLAUDE.md tells the model what it *cannot discover* from the repo:
commands, conventions, invariants, danger zones. It never tells the model how to
think.

## P3 — Progressive disclosure

One small always-loaded file; everything else (specs, task format, workflows)
loaded on demand when actually needed.

## P4 — Zero hot-path hooks

Nothing on UserPromptSubmit or Stop. At most one path-scoped PreToolUse guard.
Never content regexes.

## P5 — State on disk, not in prompt

Tasks/knowledge/decisions live in `.rulebook/` and are *queried*, not injected.

## P6 — Don't duplicate the harness

Anything Claude Code (or Cursor/Codex) ships natively is deleted from Rulebook.

## Rule-writing standard for v7

Every directive that survives into v7 must pass all four tests:

1. **Non-derivable** — states something the model cannot infer from the repo or
   already does natively.
2. **Non-contradictory** — conflicts with no other surviving rule (checked as a
   set, not per file).
3. **One statement, one place** — stated exactly once; other files may link,
   never restate.
4. **Short and declarative** — one line where one line works; no essays, no
   "why" sections in always-loaded context (rationale goes to on-demand docs).
