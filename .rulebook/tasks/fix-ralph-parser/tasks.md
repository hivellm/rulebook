# Tasks: Fix RalphParser False Negatives

- [ ] Audit all quality gate detection patterns in `src/agents/ralph-parser.ts`
- [ ] Fix type-check detection: parse `error TS` count, fail only if count > 0
- [ ] Fix lint detection: parse `X problems (Y errors, Z warnings)`, fail only if errors > 0
- [ ] Fix test detection: parse `X failed`, fail only if count > 0
- [ ] Fix "0 errors" false positive: ensure "0 errors" is treated as success
- [ ] Fix "no errors" false positive: ensure "no errors" message is treated as success
- [ ] Add pattern for `✓ X passing` vitest output → success
- [ ] Add pattern for `PASS` jest output → success
- [ ] Write test: "0 errors found" → quality gate passes
- [ ] Write test: "No lint errors" → lint gate passes
- [ ] Write test: "error TS2345" → type-check gate fails
- [ ] Write test: "2 problems (1 error, 1 warning)" → lint gate fails
- [ ] Write test: "3 failed" → test gate fails
- [ ] Run full test suite and fix any regressions
