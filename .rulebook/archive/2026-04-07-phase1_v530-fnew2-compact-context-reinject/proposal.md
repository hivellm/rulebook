# Proposal: F-NEW-2 — `COMPACT_CONTEXT.md` + SessionStart re-injection hook

Source: [docs/analysis/v5.3.0/05-tml-hooks.md#b2](../../../docs/analysis/v5.3.0/05-tml-hooks.md)

## Why
After Claude Code compacts the conversation, the model loses CLAUDE.md context until re-reading. TML solves this with a SessionStart hook (`on-compact-reinject.sh`) that dumps a ~30-line architectural cheat sheet. Generalizing this gives every rulebook-managed project a compaction-resilient channel for load-bearing reminders — the third pillar of session continuity alongside `STATE.md` and `PLANS.md`.

## What Changes
- New file `.rulebook/COMPACT_CONTEXT.md` (user-editable, ~30–50 lines) seeded by `rulebook init` from detected stack.
- New `templates/hooks/on-compact-reinject.sh` that simply `cat`s `COMPACT_CONTEXT.md`.
- `.claude/settings.json` gains `hooks.SessionStart[].matcher: "compact"`.
- Per-stack seed templates `templates/compact-context/{rust,typescript,cpp,python,go,_default}.md`.

## Impact
- Affected specs: `templates/hooks/`, `templates/compact-context/` (new)
- Affected code: `src/core/generator.ts`, `src/cli/commands.ts`
- Breaking change: NO (additive)
- User benefit: critical context survives compaction without re-reading CLAUDE.md
