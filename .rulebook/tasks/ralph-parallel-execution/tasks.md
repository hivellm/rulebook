# Tasks: Ralph Parallel Story Execution

- [ ] Add `ParallelRalphConfig` type to `src/types.ts`
- [ ] Add `ralph.parallel` config section to config-manager.ts
- [ ] Implement `analyzeDependencies(stories)` — detect serial dependencies by ID references
- [ ] Implement `partitionForParallel(stories, maxWorkers)` — group into parallel batches
- [ ] Implement parallel execution in `ralph-manager.ts`:
  - [ ] Use `Promise.allSettled()` for worker pool
  - [ ] Spawn N concurrent agent-manager runs
  - [ ] Collect results and merge learning records
- [ ] Implement `detectFileConflicts(story1, story2)` — serialize conflicting stories
- [ ] Add `--parallel <n>` flag to `ralph run` CLI command
- [ ] Add `ralph.parallel.maxWorkers` config (default 3)
- [ ] Update status display to show concurrent story progress
- [ ] Ensure quality gates run per-story immediately after completion
- [ ] Add fallback to sequential on parallel failure
- [ ] Write test: 4 independent stories with --parallel 2 → 2 concurrent batches
- [ ] Write test: dependent stories serialized automatically
- [ ] Write test: file conflict → stories serialized
- [ ] Run full test suite
