# Tasks: F6 — CLAUDE.local.md bootstrap + .gitignore

## 1. Stub
- [ ] 1.1 Create `templates/core/CLAUDE_LOCAL_STUB.md` with commented-out example overrides

## 2. gitignore utility
- [ ] 2.1 Create `src/utils/gitignore.ts` with `ensureEntries(path, entries[]): void`
- [ ] 2.2 Idempotent — never duplicate existing entries
- [ ] 2.3 Preserve existing content and comments

## 3. Init / Update wiring
- [ ] 3.1 `init` writes `CLAUDE.local.md` from stub if missing
- [ ] 3.2 `init` calls `ensureEntries('.gitignore', ['CLAUDE.local.md', '.rulebook/backup/'])`
- [ ] 3.3 `update` re-runs the gitignore check

## 4. Tail (mandatory)
- [ ] 4.1 Update or create documentation covering the implementation
- [ ] 4.2 Write tests covering the new behavior (gitignore idempotency, stub creation, init/update flows)
- [ ] 4.3 Run tests and confirm they pass
