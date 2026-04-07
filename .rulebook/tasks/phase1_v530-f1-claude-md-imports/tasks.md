# Tasks: F1 — Generic CLAUDE.md with `@import` chain

## 1. Template
- [ ] 1.1 Create `templates/core/CLAUDE_MD_v2.md` matching `docs/analysis/v5.3.0/03-claude-md-strategy.md` §3.4
- [ ] 1.2 Wrap entire body in `RULEBOOK:START v5.3.0` / `RULEBOOK:END` sentinels

## 2. Generator
- [ ] 2.1 Create `src/core/claude-md-generator.ts` with `generateClaudeMd(detection, root): string`
- [ ] 2.2 Resolve which `@imports` to emit based on file presence (always `@AGENTS.md`; conditionally `@AGENTS.override.md`, `@.rulebook/STATE.md`, `@.rulebook/PLANS.md`)
- [ ] 2.3 Wire into `src/core/generator.ts` for both `init` and `update`

## 3. Merger
- [ ] 3.1 Extend `src/core/merger.ts` to detect the `RULEBOOK:START v5.3.0` block and replace it in-place
- [ ] 3.2 Preserve all content outside the sentinels verbatim
- [ ] 3.3 Snapshot original to `.rulebook/backup/<timestamp>/CLAUDE.md` before overwrite

## 4. Tail (mandatory)
- [ ] 4.1 Update or create documentation covering the implementation
- [ ] 4.2 Write tests covering the new behavior (`tests/claude-md-generator.test.ts`)
- [ ] 4.3 Run tests and confirm they pass
