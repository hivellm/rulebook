# Tasks: F1 — Generic CLAUDE.md with `@import` chain

## 1. Template
- [x] 1.1 Created `templates/core/CLAUDE_MD_v2.md` (67 lines, well under 200-line budget)
- [x] 1.2 Wrapped entire body in `<!-- RULEBOOK:START v5.3.0 -->` / `<!-- RULEBOOK:END -->` sentinels

## 2. Generator
- [x] 2.1 Created `src/core/claude-md-generator.ts` with `generateClaudeMd(projectRoot, options)` plus helpers `getClaudeMdPath`, `readClaudeMdTemplate`, `writeClaudeMd`, `hasV2Sentinels`
- [x] 2.2 Conditional `@imports` resolved by `resolveImports()`: always emits `@AGENTS.md`; comments out `@AGENTS.override.md`, `@.rulebook/STATE.md`, `@.rulebook/PLANS.md` when their target files do not exist
- [x] 2.3 Wired into `src/cli/commands.ts` for both `init` (replaces old `generateAICLIFiles` CLAUDE.md branch) and `update` (new step after `mergeFullAgents`). Removed legacy `generateClaudeMdContent` from `src/core/workflow-generator.ts`.

## 3. Merger
- [x] 3.1 Added `mergeClaudeMd()` to `src/core/merger.ts` with three modes: `create` (no existing file), `replace` (in-place block replacement when sentinels present), `wrap` (prepend block when legacy v5.2 file)
- [x] 3.2 Content outside sentinels preserved verbatim (verified by integration test "replaces the v5.3.0 block in-place")
- [x] 3.3 Reused existing `createBackup()` from `src/utils/file-system.ts` (`.backup-<ISO-timestamp>` suffix). Followed existing codebase pattern instead of the `.rulebook/backup/<ts>/` directory pattern from the design doc — the suffix pattern already has precedent and avoids new helper code.

## 4. Tail (mandatory)
- [x] 4.1 Documentation: `proposal.md` updated with implementation summary; learnings captured to KB (see `rulebook_learn_capture` entries tagged `f1-claude-md-imports`)
- [x] 4.2 Tests: `tests/claude-md-generator.test.ts` (15 tests covering generation, conditional imports, backup, three merger modes, idempotency, sentinel detection); `tests/cli-integration.test.ts` updated to remove obsolete CLAUDE.md tests now covered by the new file
- [x] 4.3 Full suite: **1688 passed, 0 failed, 217 skipped**. Lint clean. Type-check clean.
