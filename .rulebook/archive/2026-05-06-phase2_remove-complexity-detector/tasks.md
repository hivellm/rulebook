## 1. Implementation
- [x] 1.1 Delete `src/core/detect/complexity-detector.ts` (post-reorg location)
- [x] 1.2 Remove imports + callsites from `init.ts` (informational log) and `update.ts` (rule-tier picker)
- [x] 1.3 No `complexity` field exists in `config-manager.ts` / `state-writer.ts` — was only ephemeral data
- [x] 1.4 Drop the `rulebook assess` command from `src/index.ts`
- [x] 1.5 Delete `tests/complexity-detector.test.ts`
- [x] 1.6 Note removal in CHANGELOG.md (5.6.0 entry)

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update documentation covering the implementation (CHANGELOG 5.6.0)
- [x] 2.2 Write tests covering the new behavior — N/A for pure removal; rule-engine tests unchanged
- [x] 2.3 Run tests and confirm they pass
