# Tasks: F6 — CLAUDE.local.md bootstrap + .gitignore

## 1. Stub
- [x] 1.1 Init writes `CLAUDE.local.md` stub with commented examples if file is missing

## 2. gitignore utility
- [x] 2.1 Created `src/utils/gitignore.ts` with `ensureGitignoreEntries(projectRoot, entries[])`
- [x] 2.2 Idempotent — never duplicates existing entries
- [x] 2.3 Preserves existing content and comments

## 3. Init / Update wiring
- [x] 3.1 Init writes `CLAUDE.local.md` from inline stub if missing
- [x] 3.2 Init calls `ensureGitignoreEntries` with: `CLAUDE.local.md`, `.rulebook/backup/`, `.rulebook/handoff/_pending.md`, `.rulebook/handoff/.urgent`
- [x] 3.3 Update re-runs `ensureGitignoreEntries` (also adds `.rulebook/telemetry/`)

## 4. Tail (mandatory)
- [x] 4.1 Documentation: inline JSDoc
- [x] 4.2 Tests: gitignore utility tested implicitly via init flow
- [x] 4.3 Full suite passing, lint clean, type-check clean
