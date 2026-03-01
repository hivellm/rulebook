# Proposal: Ralph Parallel Story Execution (--parallel flag)

## Context

Ralph currently solves user stories sequentially (one at a time). For stories that are independent, parallel execution could significantly reduce loop completion time. This is especially valuable for monorepos where different packages can be worked on simultaneously.

## Solution

Add `--parallel <n>` flag to `ralph run` that runs N stories concurrently:

1. **Dependency analysis**: detect story dependencies (if story B mentions story A's ID → serial)
2. **Worker pool**: run up to N concurrent AI tool processes
3. **Git conflict prevention**: each parallel story works on its own branch, merged at end
4. **Status display**: multi-line progress showing all active stories

## Safety Constraints

- **File conflict detection**: if two stories modify the same file, serialize them
- **Quality gates**: run per-story gates immediately after each story completes
- **Max parallel**: cap at `maxParallelTasks` from config (default 5)
- **Graceful degradation**: if parallel fails, fall back to sequential

## New Config

```json
"ralph": {
  "parallel": {
    "enabled": false,
    "maxWorkers": 3
  }
}
```

## Files to Modify

- `src/core/ralph-manager.ts` — parallel story execution
- `src/core/agent-manager.ts` — parallel agent spawning
- `src/cli/commands.ts` — `--parallel <n>` flag
- `src/types.ts` — ParallelRalphConfig type
- `tests/ralph-parallel.test.ts` — new test file
