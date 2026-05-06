## 1. Implementation
- [x] 1.1 Delete `src/core/ide/cursor-mdc-generator.ts` (post-reorg location)
- [x] 1.2 Delete `templates/ides/cursor-mdc/` in full
- [x] 1.3 Existing `.cursor/rules/*.mdc` left in place (non-destructive removal — generator won't regenerate them)
- [x] 1.4 Remove the cursor-mdc invocation from `core/generators/generator.ts` (entry point that gated on `isCursorInstalled`)
- [x] 1.5 Update CHANGELOG.md noting Cursor users rely on `AGENTS.md` (Cursor reads it natively)
- [x] 1.6 Delete `tests/cursor-mdc.test.ts`
- [x] 1.7 Note removal in CHANGELOG.md (5.6.0 entry)

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update documentation covering the implementation (CHANGELOG 5.6.0)
- [x] 2.2 Write tests covering the new behavior — N/A for pure removal
- [x] 2.3 Run tests and confirm they pass
