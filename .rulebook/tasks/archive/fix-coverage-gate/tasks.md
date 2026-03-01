# Tasks: Fix Coverage Gate — Real Parsing

- [x] Read `checkCoverage()` in `src/core/agent-manager.ts` and understand current stub
- [x] Add `parseCoveragePercentage(output: string): number | null` to `ralph-parser.ts`
- [x] Implement vitest coverage parsing: `All files | XX.XX |` table row pattern
- [x] Implement jest coverage parsing: `Lines : XX.XX%` pattern
- [x] Implement c8/nyc parsing: `% Lines\s+|\s+XX.XX` pattern
- [x] Wire `parseCoveragePercentage()` into `checkCoverage()` in agent-manager.ts
- [x] Compare parsed value against `config.coverageThreshold` from rulebook.json
- [x] Graceful degradation: warn to stderr, return true (skip gate) if parsing fails
- [x] Write test: vitest output with 87% → returns 87
- [x] Write test: jest output with 45% → returns 45, fails if threshold is 60
- [x] Write test: unparseable output → warns and does not fail
- [x] Write test: `coverageThreshold` from config is respected
- [x] Run full test suite and fix any regressions
