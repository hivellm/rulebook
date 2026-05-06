## 1. Implementation
- [ ] 1.1 Delete `src/core/health-scorer.ts`
- [ ] 1.2 Remove the `health` branch from `src/cli/commands/misc.ts` (or wherever `doctor health` is wired)
- [ ] 1.3 Strip any health-scorer reference from `src/core/doctor.ts`
- [ ] 1.4 Update CLI help/usage text to drop the `doctor health` subcommand
- [ ] 1.5 Delete `tests/health-scorer*.test.ts`
- [ ] 1.6 Note the removal in CHANGELOG.md under "Removed"

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass
