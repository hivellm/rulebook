# Tasks: Ralph Context Compression

- [x] Add `contextCompression` config type in `src/types.ts`
- [x] Add `ralph.contextCompression` to config-manager.ts schema with defaults
- [x] Implement `buildCompressedContext(recentCount, threshold)` in iteration-tracker.ts
- [x] Summary format: one line per iteration with story ID, status, quality gate flags
- [x] Two-tier context: recent N iterations (full detail) + older (compressed summary)
- [x] Configurable recentCount (default: 3) and threshold (default: 5)
- [x] Returns "No iteration history" when empty
- [x] Implement memory-backed retrieval: IterationMemoryAdapter interface + setMemoryAdapter() + enrichment in buildCompressedContext()
- [x] Wire context compression into iteration prompt building in ralph-manager.ts
- [x] Write test: 6 iterations → first 3 compressed, last 3 full
- [x] Write test: quality gate flags in compressed lines (✓ts, ✗lint, etc.)
- [x] Write test: below threshold → full history returned
- [x] Write test: empty history → informative message
- [x] Write test: memory adapter enriches context with learnings
- [x] Write test: missing adapter does not break compression
- [x] Run full test suite (916 tests passing)
