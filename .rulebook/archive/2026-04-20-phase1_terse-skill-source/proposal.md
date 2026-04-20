# Proposal: phase1_terse-skill-source

Source: docs/analysis/caveman/

## Why

The `rulebook-terse` skill is the source of truth for output-compression behavior. It must define four intensity levels aligned with Rulebook's existing tier system (Research/Standard/Core), a mandatory auto-clarity escape hatch (security, destructive ops, quality-gate failures, user confusion), and explicit boundaries (code/tests/commits stay normal). Without this file, Phase 2 hooks have nothing to inject.

## What Changes

- Finalize `templates/skills/rulebook-terse/SKILL.md` with YAML frontmatter (`name`, `description` with natural-language activation triggers).
- Four-row intensity table (`off`/`brief`/`terse`/`ultra`) with calibrated before/after examples per level.
- Auto-clarity section listing five trigger contexts (security, destructive ops, quality-gate failures, multi-step sequences, user confusion).
- Boundaries section declaring code/tests/commits/specs unchanged.
- Persistence section — mode sticky across turns until explicitly changed or session end.

## Impact

- Affected specs: `.rulebook/specs/rulebook-terse/spec.md` (MODIFIED intensity contract)
- Affected code: none (skill file only)
- Breaking change: NO
- User benefit: Skill invokable via manual `/rulebook-terse` before hooks ship.
