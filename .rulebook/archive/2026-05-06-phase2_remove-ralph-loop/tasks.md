## 1. Source code removal
- [x] 1.1 Delete `src/agents/ralph-parser.ts`
- [x] 1.2 Delete `src/cli/commands/ralph.ts` and unregister from `src/cli/commands/index.ts`
- [x] 1.3 Delete `src/core/ralph/` (entire dir: ralph-manager, ralph-parallel, ralph-plan-checkpoint, ralph-scripts, prd-generator, iteration-tracker)
- [x] 1.4 Strip Ralph types from `src/types.ts` (RalphPRD, PRDUserStory, RalphLoopState, RalphIterationMetadata, IterationResult, ParallelRalphConfig, PlanCheckpointConfig); strip ralph config block + migration logic from `state/config-manager.ts`; strip `ralph` field from `init.ts`/`update.ts`; remove `learnFromRalphCommand` + `LearnManager.fromRalph` from tasks
- [x] 1.5 Remove `rulebook_ralph_*` tool registrations from `mcp/rulebook-server.ts` (590 lines deleted)

## 2. Test suite cleanup
- [x] 2.1 Delete 9 `tests/ralph-*.test.ts` + `tests/iteration-tracker-insights.test.ts` + `tests/prd-generator-specs.test.ts` + `tests/security-gate.test.ts`
- [x] 2.2 Removed `fromRalph` describe block from `tests/learn-manager.test.ts`
- [x] 2.3 Full suite re-run: 1446/1446 passing

## 3. Templates and scripts
- [x] 3.1 Delete `templates/ralph/` in full
- [x] 3.2 Delete `.rulebook/scripts/ralph-*.sh` + `.bat`
- [x] 3.3 `cursor-mdc/ralph.mdc` already deleted with cursor-mdc-generator removal
- [x] 3.4 Delete `.claude/commands/ralph-*.md` slash commands
- [x] 3.5 `init.ts` no longer installs ralph scripts

## 4. Documentation
- [x] 4.1 Remove "Ralph Autonomous Loop" section from `AGENTS.md`
- [x] 4.2 README.md ralph references — N/A (none in scope)
- [x] 4.3 Add 5.6.0 CHANGELOG entry (in same commit)
- [x] 4.4 Spec files unchanged (no ralph spec existed; mentions in TOKEN_OPTIMIZATION etc. are inert)
- [x] 4.5 Delegation tables — N/A (no ralph row in current AGENTS.md table)

## 5. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 5.1 Update documentation covering the implementation (CHANGELOG 5.6.0)
- [x] 5.2 Write tests covering the new behavior — N/A for pure removal
- [x] 5.3 Run tests and confirm they pass
