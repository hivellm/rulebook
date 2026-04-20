# Proposal: phase2_terse-hooks-ts

Source: docs/analysis/caveman/06-hook-deep-dive.md

## Why

The output-compression mechanism lives in two hooks. SessionStart injects the filtered SKILL.md as hidden `additionalContext` once per session; UserPromptSubmit emits a ~45-token attention anchor on every user message to prevent drift. Without these, the skill file sits on disk but never reaches the model. Manual `/rulebook-terse` invocation is error-prone and doesn't survive context compaction. Caveman's hooks are Node; Rulebook already ships Node-based enforcement hooks so the pattern fits existing infrastructure.

## What Changes

- `src/hooks/terse-activate.ts` — SessionStart hook: resolve mode via `terse-config`, `safeWriteFlag($RULEBOOK_CONFIG_DIR/.rulebook-terse-mode, mode)`, read SKILL.md, strip YAML frontmatter, filter intensity table + examples to active level, emit filtered body to stdout.
- `src/hooks/terse-mode-tracker.ts` — UserPromptSubmit hook: parse slash commands (`/rulebook-terse`, `/rulebook-terse brief|terse|ultra|off`) and natural-language triggers, update/delete flag, emit `hookSpecificOutput.additionalContext` attention anchor when active.
- `src/hooks/terse-config.ts` — mode resolution (env `RULEBOOK_TERSE_MODE` → `.rulebook/rulebook.json` → user-global config → default).
- `src/core/claude-settings-manager.ts` — add `terseMode` to `ClaudeSettingsDesire`, extend `SIGNATURES` table, wire upserts for SessionStart + UserPromptSubmit.
- Hooks compile via existing `tsc` to `dist/hooks/`, copied to `.claude/hooks/` on init/update.

## Impact

- Affected specs: `.rulebook/specs/rulebook-terse/spec.md` (ADDED hook-driven activation requirements)
- Affected code: `src/hooks/*` (new), `src/core/claude-settings-manager.ts`
- Breaking change: NO — existing SessionStart/UserPromptSubmit hooks coexist (signature-based append)
- User benefit: Automatic hidden activation per session; mode survives compaction via per-turn reinforcement.
