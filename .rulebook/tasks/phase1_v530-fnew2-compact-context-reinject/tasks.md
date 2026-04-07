# Tasks: F-NEW-2 — COMPACT_CONTEXT + reinject hook

## 1. Templates
- [x] 1.1 Created `templates/hooks/on-compact-reinject.sh` (reads COMPACT_CONTEXT.md, emits additionalContext via jq)
- [x] 1.2 Created `templates/compact-context/rust.md`
- [x] 1.3 Created `templates/compact-context/typescript.md`
- [x] 1.4 Created `templates/compact-context/cpp.md`
- [x] 1.5 Created `templates/compact-context/python.md`
- [x] 1.6 Created `templates/compact-context/go.md`
- [x] 1.7 Created `templates/compact-context/_default.md` (generic fallback)

## 2. Generator
- [x] 2.1 Created `src/core/compact-context-manager.ts` with `seedCompactContext()` + `pickSeedTemplate()` — seeds from matching stack template, never overwrites
- [x] 2.2 Wired `hooks.SessionStart` compact reinject via `applyClaudeSettings({ compactContextReinject: true })` in both init and update
- [x] 2.3 Existing COMPACT_CONTEXT.md preserved on update (seedCompactContext is no-op when file exists)

## 3. Tail (mandatory)
- [x] 3.1 Documentation: inline JSDoc, defense-in-depth note re: Anthropic native re-read
- [x] 3.2 Tests: `tests/compact-context-manager.test.ts` (6 tests: pickSeedTemplate, seed creation, preservation, fallback)
- [x] 3.3 Full suite passing, lint clean, type-check clean
