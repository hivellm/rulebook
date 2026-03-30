# Tasks: AGENTS.override.md Pattern

- [x] Write `templates/core/AGENTS_OVERRIDE.md` empty template with instructions
- [x] Create `AGENTS.override.md` during `rulebook init` if it doesn't exist
- [x] Implement `readOverrideContent(projectRoot)` in generator.ts
- [x] Append override content to end of generated AGENTS.md in `generateAgentsMd()`
- [x] Ensure `merger.ts` never modifies content sourced from AGENTS.override.md
- [x] Ensure `rulebook update` never overwrites AGENTS.override.md
- [x] Add `override` subcommand to CLI:
  - [x] `rulebook override edit` — open in $EDITOR (or show path if no EDITOR)
  - [x] `rulebook override show` — display current content
  - [x] `rulebook override clear` — reset to empty template
- [x] Register `override` in `src/index.ts`
- [x] Write test: override content appended to AGENTS.md
- [x] Write test: empty override → nothing appended
- [x] Write test: update does not overwrite AGENTS.override.md
- [x] Write test: init creates AGENTS.override.md with template
- [x] Run full test suite
