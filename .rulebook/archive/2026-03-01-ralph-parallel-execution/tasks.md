# Tasks: Ralph Parallel Story Execution

- [x] Add `ParallelRalphConfig` type to `src/types.ts`
- [x] Add `ralph.parallel` config section to config-manager.ts
- [x] Implement `analyzeDependencies(stories)` — detect serial dependencies by ID references
- [x] Implement `partitionForParallel(stories, maxWorkers)` — group into parallel batches
- [x] Implement parallel execution in `ralph-manager.ts`:
  - [x] Use `Promise.allSettled()` for worker pool
  - [x] Spawn N concurrent agent-manager runs
  - [x] Collect results and merge learning records
- [x] Implement `detectFileConflicts(story1, story2)` — serialize conflicting stories
- [x] Add `--parallel <n>` flag to `ralph run` CLI command
- [x] Add `ralph.parallel.maxWorkers` config (default 3)
- [x] Update status display to show concurrent story progress
- [x] Ensure quality gates run per-story immediately after completion
- [x] Add fallback to sequential on parallel failure
- [x] Write test: 4 independent stories with --parallel 2 → 2 concurrent batches
- [x] Write test: dependent stories serialized automatically
- [x] Write test: file conflict → stories serialized
- [x] Run full test suite
