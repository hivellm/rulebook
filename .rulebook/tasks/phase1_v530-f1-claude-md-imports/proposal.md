# Proposal: F1 — Generic CLAUDE.md with `@import` chain

Source: [docs/analysis/v5.3.0/04-features.md#f1](../../../docs/analysis/v5.3.0/04-features.md) · [03-claude-md-strategy.md](../../../docs/analysis/v5.3.0/03-claude-md-strategy.md)

## Why
Current rulebook generates a CLAUDE.md mixing generic rulebook content with project-specific data. tml's CLAUDE.md is 1021 lines (5x over Anthropic's 200-line budget); UzEngine's is 355. Anthropic's official memory docs recommend a thin CLAUDE.md composed of `@imports`. v5.3.0 must align with this model so updates are safe and per-project state lives in imported files.

## What Changes
- New `templates/core/CLAUDE_MD_v2.md` template (~120 lines) — entirely composed of `@imports` + a small fixed "critical rules" section, wrapped in `RULEBOOK:START v5.3.0` / `RULEBOOK:END` sentinels.
- New `src/core/claude-md-generator.ts` that renders the imports based on detected files (`AGENTS.md`, `AGENTS.override.md`, `.rulebook/STATE.md`, `.rulebook/PLANS.md`).
- `src/core/generator.ts` routes CLAUDE.md generation through the new module.
- `src/core/merger.ts` gains `RULEBOOK:START`/`END` block-replacement logic for CLAUDE.md.
- Pre-update snapshot to `.rulebook/backup/<timestamp>/CLAUDE.md`.

## Impact
- Affected specs: `templates/core/`
- Affected code: `src/core/generator.ts`, `src/core/merger.ts`, new `src/core/claude-md-generator.ts`
- Breaking change: NO (v5.2 CLAUDE.md without sentinels is migrated by F8 / migration flow)
- User benefit: CLAUDE.md stays under Anthropic's 200-line budget, regenerable on every `rulebook update` without losing user content
