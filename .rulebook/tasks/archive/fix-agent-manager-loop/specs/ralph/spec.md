# Spec: AgentManager Loop and Coverage Gate Fix

## Loop Behavior Requirements

- SHALL iterate over all tasks in the task list, not just the first one
- SHALL break the loop when: `paused === true`, `currentIteration >= maxIterations`, or fatal error
- SHALL NOT break unconditionally after processing a single task
- SHALL preserve existing behavior for single-task loops

## Coverage Gate Requirements

- SHALL parse actual coverage percentage from test runner stdout
- SHALL support vitest output format: table row `All files | XX.XX |`
- SHALL support jest output format: `Lines : XX.XX%`
- SHALL compare parsed percentage against `config.coverageThreshold`
- SHALL return `true` (pass) when parsed coverage >= threshold
- SHALL return `false` (fail) when parsed coverage < threshold
- SHALL emit warning to stderr and return `true` (skip) when parsing fails
- MUST NOT hardcode any coverage percentage value
