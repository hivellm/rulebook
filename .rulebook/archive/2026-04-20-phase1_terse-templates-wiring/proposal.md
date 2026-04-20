# Proposal: phase1_terse-templates-wiring

Source: docs/analysis/caveman/

## Why

Rulebook uses `rulebook init`/`rulebook update` to install skill files into user projects. After SKILL.md files are authored, the skills-manager and generator pipeline must know to copy them into new and existing projects. Without this wiring, `rulebook init` creates projects with no terse skill installed.

## What Changes

- `src/core/skills-manager.ts` — register `rulebook-terse`, `rulebook-terse-commit`, `rulebook-terse-review` in the skill catalog; include in default enabled-skills list.
- `src/core/generator.ts` — include the three skills in the copy pipeline during `init` and `update`.
- Dogfood: run `rulebook update` locally to install the new skills in this repo's `.claude/skills/`.
- No hook wiring yet — Phase 2 ships that.

## Impact

- Affected specs: none (wiring only)
- Affected code: `src/core/skills-manager.ts`, `src/core/generator.ts`
- Breaking change: NO
- User benefit: New projects auto-install terse skills; existing projects adopt on next `rulebook update`.
