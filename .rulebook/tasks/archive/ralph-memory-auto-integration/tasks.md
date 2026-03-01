# Tasks: Ralph → Memory Auto-Integration

- [x] Audit `iteration-tracker.ts` to understand structured learning data output
- [x] Add `RalphMemoryAdapter` interface to `ralph-manager.ts` (avoids hard dependency)
- [x] Add `setMemoryAdapter(adapter)` method to `RalphManager`
- [x] Add `saveIterationToMemory()` fire-and-forget in `ralph-manager.ts`
- [x] Save iteration learnings as `type: "learning"` with `["ralph", story-id]` tags
- [x] Save quality gate failures as `type: "bug"` with error context and tags
- [x] Save successful story completion as `type: "observation"` with summary
- [x] Write test: iteration learning is saved to memory after success
- [x] Write test: quality gate failure is saved as bug memory
- [x] Write test: story completion saved as observation memory
- [x] Write test: memory not required (graceful degradation if disabled)
- [x] Write test: memory save failure does not fail the iteration
- [x] Run full test suite and fix any regressions
