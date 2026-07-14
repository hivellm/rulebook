# Proposal: phase4_v7-asset-prune

Source: docs/analysis/v7-performance/

## Why

Default init installs 91 files (F-004), most duplicating capabilities the modern
harness ships natively (F-010): 12 generic agents vs native
general-purpose/Explore/Plan/code-reviewer; generic engineering skills vs native
/code-review//simplify//verify; handoff vs native compaction; terse mode vs
native verbosity control. Duplicates pad every session's context, confuse the
model with parallel mechanisms, and create upgrade churn.

## What Changes

- Agents: 0 installed by default; `rulebook agents add <role>` keeps them
  available opt-in.
- Skills: only Rulebook-specific ones ship (task flows, analysis); generic
  engineering skills removed from default install.
- Workflows: opt-in via `rulebook workflows add`.
- Handoff, terse-mode, teams-enforcement, and token-tier subsystems deleted:
  templates, hooks, skills, specs, and their generation code. PLANS.md survives
  as an optional scratchpad.

## Impact

- Affected specs: MULTI_AGENT.md, AGENT_AUTOMATION.md, TOKEN_OPTIMIZATION.md
  (deleted or rewritten), RULEBOOK.md
- Affected code: src/core/generators/*, templates/agents/*, templates/skills/*,
  templates/hooks/* (terse/handoff), templates/compact-context/*, src/hooks/*
- Breaking change: YES (installed asset set shrinks; migration in phase5)
- User benefit: −84% installed files, no duplicate mechanisms competing with the
  harness, Opus/Fable use their native agents and skills unimpeded
