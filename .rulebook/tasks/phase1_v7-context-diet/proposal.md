# Proposal: phase1_v7-context-diet

Source: docs/analysis/v7-performance/

## Why

Measured v6 overhead: ~15k tokens of static context injected into every session
(CLAUDE.md imports + 19 rule files + agent/skill descriptions), with the same
directives duplicated 2–3× and several mutually contradictory (findings F-001,
F-008). This dilutes model attention, consumes 7–8% of the context window before
work starts, and is the largest fixed cost of Rulebook v6. v7's mission is to run
complementary to Opus/Fable — simple, clear rules that never stuff the context.

## What Changes

- Generators emit lean-only context: CLAUDE.md ≤60 lines (draft 6.1), AGENTS.md
  <3 KB index (draft 6.2); fat-mode generation paths removed.
- `.claude/rules/` generation collapses 19 files → 1 optional language file
  (draft 6.3); every duplicated/contradictory directive from F-008 is removed.
- CLAUDE.md no longer imports rule essays; one statement, one place.
- Orchestration directive becomes a single advisory line in the model's favor
  (P0): subagents/parallelism/teams are the model's choice, never mandated.
- Analysis directives standardized to numbered-files-by-theme (already landed on
  release/v7.0.0 for skill + command; generators must emit the same).

## Impact

- Affected specs: RULEBOOK.md, TIER1_PROHIBITIONS.md, TOKEN_OPTIMIZATION.md,
  MULTI_AGENT.md (directive content regenerated lean)
- Affected code: src/core/generators/* (CLAUDE.md/AGENTS.md/rules emitters),
  templates/core/*, templates/rules/*
- Breaking change: YES (generated file set changes; migration handled in phase5)
- User benefit: −83% static context per session (≤2,500 tok target), clearer
  rules the model actually follows, no attention dilution
