## 1. Implementation
- [ ] 1.1 Delete `src/core/complexity-detector.ts`
- [ ] 1.2 Remove imports + callsites from `src/cli/commands/init.ts`, `src/cli/commands/update.ts`, `src/index.ts`
- [ ] 1.3 Remove `complexity` config field handling from `src/core/config-manager.ts` and `src/core/state-writer.ts`
- [ ] 1.4 Simplify any UX text/output that referenced the complexity score
- [ ] 1.5 Delete `tests/complexity-detector*.test.ts`
- [ ] 1.6 Note removal in CHANGELOG.md under "Removed"

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass
