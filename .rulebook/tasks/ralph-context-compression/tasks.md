# Tasks: Ralph Context Compression

- [ ] Add `contextCompression` config type in `src/types.ts`
- [ ] Add `ralph.contextCompression` to config-manager.ts schema with defaults
- [x] Implement `buildCompressedContext(recentCount, threshold)` in iteration-tracker.ts
- [x] Summary format: one line per iteration with story ID, status, quality gate flags
- [x] Two-tier context: recent N iterations (full detail) + older (compressed summary)
- [x] Configurable recentCount (default: 3) and threshold (default: 5)
- [x] Returns "No iteration history" when empty
- [ ] Implement memory-backed retrieval: search memory for relevant past learnings
- [ ] Wire context compression into iteration prompt building in ralph-manager.ts
- [x] Write test: 6 iterations → first 3 compressed, last 3 full
- [x] Write test: quality gate flags in compressed lines (✓ts, ✗lint, etc.)
- [x] Write test: below threshold → full history returned
- [x] Write test: empty history → informative message
- [x] Run full test suite (903 tests passing)
