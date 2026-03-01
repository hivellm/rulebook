# Tasks: AGENTS.override.md Pattern

- [ ] Write `templates/core/AGENTS_OVERRIDE.md` empty template with instructions
- [ ] Create `AGENTS.override.md` during `rulebook init` if it doesn't exist
- [ ] Implement `readOverrideContent(projectRoot)` in generator.ts
- [ ] Append override content to end of generated AGENTS.md in `generateAgentsMd()`
- [ ] Ensure `merger.ts` never modifies content sourced from AGENTS.override.md
- [ ] Ensure `rulebook update` never overwrites AGENTS.override.md
- [ ] Add `override` subcommand to CLI:
  - [ ] `rulebook override edit` — open in $EDITOR (or show path if no EDITOR)
  - [ ] `rulebook override show` — display current content
  - [ ] `rulebook override clear` — reset to empty template
- [ ] Register `override` in `src/index.ts`
- [ ] Write test: override content appended to AGENTS.md
- [ ] Write test: empty override → nothing appended
- [ ] Write test: update does not overwrite AGENTS.override.md
- [ ] Write test: init creates AGENTS.override.md with template
- [ ] Run full test suite
