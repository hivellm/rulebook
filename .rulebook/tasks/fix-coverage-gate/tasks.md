# Tasks: Fix Coverage Gate — Real Parsing

- [ ] Read `checkCoverage()` in `src/core/agent-manager.ts` and understand current stub
- [ ] Add `parseCoveragePercentage(output: string): number | null` to `ralph-parser.ts`
- [ ] Implement vitest coverage parsing: `All files | XX.XX |` table row pattern
- [ ] Implement jest coverage parsing: `Lines : XX.XX%` pattern
- [ ] Implement c8/nyc parsing: `% Lines\s+|\s+XX.XX` pattern
- [ ] Wire `parseCoveragePercentage()` into `checkCoverage()` in agent-manager.ts
- [ ] Compare parsed value against `config.coverageThreshold` from rulebook.json
- [ ] Graceful degradation: warn to stderr, return true (skip gate) if parsing fails
- [ ] Write test: vitest output with 87% → returns 87
- [ ] Write test: jest output with 45% → returns 45, fails if threshold is 60
- [ ] Write test: unparseable output → warns and does not fail
- [ ] Write test: `coverageThreshold` from config is respected
- [ ] Run full test suite and fix any regressions
