# Proposal: phase3_compress-cli

Source: docs/analysis/caveman/02-skill-design.md

## Why

The base `rulebook-terse` skill reduces what the model *speaks*. `rulebook compress` reduces what the model *reads*: `CLAUDE.md` and other memory files load on every session start, so a 40% reduction there is a per-session dividend paid forever. Rulebook already shipped the input-side reduction for its own generated `AGENTS.md` (250KB → 1.4KB), but user-editable memory files (overrides, plans, knowledge) still expand. This CLI closes that gap with a safe compressor that preserves code/URLs/paths/commands/dates/versions byte-for-byte.

## What Changes

- `src/skills/compress/cli.ts` — CLI surface: `rulebook compress <file>` (rewrite in place + backup to `.original.md`), `--dry-run` (diff only), `--restore` (from backup), `--check` (ratio only).
- `src/skills/compress/validator.ts` — enforces invariants: every heading present round-trip, every fenced code block byte-identical, every URL/path/command/date/version byte-identical.
- `src/skills/compress/compressor.ts` — prose rewriter. 2-retry budget on validation failure before hard failure.
- Dogfood: compress `templates/core/CLAUDE.md` (generated template) and commit the result alongside the `.original.md` backup.

## Impact

- Affected specs: `.rulebook/specs/rulebook-terse/spec.md` (ADDED compression invariants)
- Affected code: `src/skills/compress/*` (new), CLI registration in `src/cli/commands/`
- Breaking change: NO
- User benefit: Per-session input token reduction on every rulebook-initialized project; ≥30% target on representative memory files.
