# Tasks: Fix RalphParser False Negatives

- [x] Audit all quality gate detection patterns in `src/agents/ralph-parser.ts`
- [x] Fix type-check detection: parse `error TS` count, fail only if count > 0
- [x] Fix lint detection: parse `X problems (Y errors, Z warnings)`, fail only if errors > 0
- [x] Fix test detection: parse `X failed`, fail only if count > 0
- [x] Fix "0 errors" false positive: ensure "0 errors" is treated as success
- [x] Fix "no errors" false positive: ensure "no errors" message is treated as success
- [x] Add pattern for `✓ X passing` vitest output → success
- [x] Add pattern for `PASS` jest output → success
- [x] Write test: "0 errors found" → quality gate passes
- [x] Write test: "No lint errors" → lint gate passes
- [x] Write test: "error TS2345" → type-check gate fails
- [x] Write test: "2 problems (1 error, 1 warning)" → lint gate fails
- [x] Write test: "3 failed" → test gate fails
- [x] Run full test suite and fix any regressions
