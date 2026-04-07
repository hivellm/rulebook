# Tasks: F-NEW-2 — COMPACT_CONTEXT + reinject hook

## 1. Templates
- [ ] 1.1 Create `templates/hooks/on-compact-reinject.sh`
- [ ] 1.2 Create `templates/compact-context/rust.md`
- [ ] 1.3 Create `templates/compact-context/typescript.md`
- [ ] 1.4 Create `templates/compact-context/cpp.md`
- [ ] 1.5 Create `templates/compact-context/python.md`
- [ ] 1.6 Create `templates/compact-context/go.md`
- [ ] 1.7 Create `templates/compact-context/_default.md`

## 2. Generator
- [ ] 2.1 `src/core/generator.ts` writes `.rulebook/COMPACT_CONTEXT.md` from matching stack template during init
- [ ] 2.2 Wire `hooks.SessionStart[].matcher: "compact"` into generated `.claude/settings.json`
- [ ] 2.3 Preserve user-edited COMPACT_CONTEXT.md on `update` (never overwrite if exists)

## 3. Tail (mandatory)
- [ ] 3.1 Update or create documentation covering the implementation
- [ ] 3.2 Write tests covering the new behavior (seed selection per stack, preservation on update)
- [ ] 3.3 Run tests and confirm they pass
