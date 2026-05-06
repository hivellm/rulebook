## 1. Implementation
- [x] 1.1 Delete `src/core/quality/health-scorer.ts` (post-reorg location)
- [x] 1.2 Remove `healthCommand` from `src/cli/commands/misc.ts` (`rulebook health` was a top-level command, not a `doctor` subcommand)
- [x] 1.3 No reference in `src/core/quality/doctor.ts` to strip — `doctor` is independent
- [x] 1.4 Drop the `program.command('health')` registration from `src/index.ts` and the export from `src/cli/commands/index.ts`
- [x] 1.5 Delete `tests/health-scorer.test.ts`
- [x] 1.6 Note the removal in CHANGELOG.md (5.6.0 entry)

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update documentation covering the implementation (CHANGELOG 5.6.0)
- [x] 2.2 Write tests covering the new behavior — N/A for pure removal; the existing suite (1713/1713) regression-tests that nothing else broke
- [x] 2.3 Run tests and confirm they pass
