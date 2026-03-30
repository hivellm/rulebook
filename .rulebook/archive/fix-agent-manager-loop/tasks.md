# Tasks: Fix AgentManager Infinite Loop Bug

- [x] Read and understand full `runAgentWorkflow()` flow in `src/core/agent-manager.ts`
- [x] Remove unconditional `break` at end of task iteration loop
- [x] Add conditional break for paused state check
- [x] Add conditional break for max iterations exceeded
- [x] Add conditional break for fatal/unrecoverable errors
- [x] Rewrite `checkCoverage()` to parse real vitest output (`All files | XX |` pattern)
- [x] Rewrite `checkCoverage()` to parse jest output (`Lines: XX%` pattern)
- [x] Add fallback: warn and skip if coverage output cannot be parsed
- [x] Write tests for multi-iteration workflow (3+ stories completing in sequence)
- [x] Write tests for coverage parsing with vitest output fixture
- [x] Write tests for coverage parsing with jest output fixture
- [x] Run full test suite and fix any regressions
