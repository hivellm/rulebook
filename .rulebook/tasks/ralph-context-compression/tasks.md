# Tasks: Ralph Context Compression

- [ ] Add `contextCompression` config type in `src/types.ts`
- [ ] Add `ralph.contextCompression` to config-manager.ts schema with defaults
- [ ] Implement `summarizeIterations(iterations: IterationRecord[]): string` in iteration-tracker.ts
- [ ] Summary format: one line per iteration with story ID, outcome, key learnings
- [ ] Implement two-tier context builder in ralph-manager.ts:
  - [ ] Recent N iterations: full detail (configurable, default 3)
  - [ ] Older iterations: compressed summary
- [ ] Add compression threshold config (default: 5 iterations before compressing)
- [ ] Implement memory-backed retrieval: search memory for relevant past learnings
- [ ] Add `getCompressedContext(projectRoot, storyId)` function
- [ ] Wire context compression into iteration prompt building
- [ ] Write test: 6 iterations → first 3 compressed, last 3 full
- [ ] Write test: summary contains story IDs and key learnings
- [ ] Write test: compression disabled → full history passed
- [ ] Write test: below threshold → no compression applied
- [ ] Run full test suite
