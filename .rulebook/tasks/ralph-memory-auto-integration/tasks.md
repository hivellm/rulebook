# Tasks: Ralph → Memory Auto-Integration

- [ ] Audit `iteration-tracker.ts` to understand structured learning data output
- [ ] Add `saveIterationToMemory(iteration, memoryManager)` in `ralph-manager.ts`
- [ ] Save iteration learnings as `type: "learning"` with `["ralph", story-id]` tags
- [ ] Save quality gate failures as `type: "bug"` with error context and tags
- [ ] Save successful story completion as `type: "observation"` with summary
- [ ] Add `loadPriorRalphContext(memoryManager)` — search memory at loop start
- [ ] Include prior learnings in Ralph prompt context (inject into iteration prompt)
- [ ] Add memory manager initialization in ralph-manager.ts
- [ ] Write test: iteration learning is saved to memory after success
- [ ] Write test: quality gate failure is saved as bug memory
- [ ] Write test: prior learnings are loaded at loop start
- [ ] Write test: memory not required (graceful degradation if disabled)
- [ ] Update CLAUDE.md Ralph section to document memory auto-capture behavior
