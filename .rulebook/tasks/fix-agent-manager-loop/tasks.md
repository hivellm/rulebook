# Tasks: Fix AgentManager Infinite Loop Bug

- [ ] Read and understand full `runAgentWorkflow()` flow in `src/core/agent-manager.ts`
- [ ] Remove unconditional `break` at end of task iteration loop
- [ ] Add conditional break for paused state check
- [ ] Add conditional break for max iterations exceeded
- [ ] Add conditional break for fatal/unrecoverable errors
- [ ] Rewrite `checkCoverage()` to parse real vitest output (`All files | XX |` pattern)
- [ ] Rewrite `checkCoverage()` to parse jest output (`Lines: XX%` pattern)
- [ ] Add fallback: warn and skip if coverage output cannot be parsed
- [ ] Write tests for multi-iteration workflow (3+ stories completing in sequence)
- [ ] Write tests for coverage parsing with vitest output fixture
- [ ] Write tests for coverage parsing with jest output fixture
- [ ] Run full test suite and fix any regressions
