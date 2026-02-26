# Tasks: Integrate Ralph Autonomous Loop

## Phase 1: Core Architecture ✅

- [x] Create `src/core/ralph-manager.ts` with iteration loop orchestration
- [x] Create `src/core/prd-generator.ts` to convert tasks to PRD JSON format
- [x] Create `src/core/iteration-tracker.ts` for history and metrics tracking
- [x] Extend `src/types.ts` with RalphConfig, IterationResult, PRDTask interfaces
- [ ] Update `src/core/agent-manager.ts` to support Ralph execution mode

## Phase 2: Agent Integration ✅

- [x] Create `src/agents/ralph-parser.ts` to extract task status from AI output
- [ ] Add Ralph-specific prompt templates for Claude Code and Amp
- [x] Implement quality gate checks (type-check, lint, tests)
- [x] Add iteration learning capture from agent output

## Phase 3: CLI Commands ✅

- [x] Add `ralph init` command to initialize Ralph and create PRD
- [x] Add `ralph run` command with --max-iterations and --tool flags
- [x] Add `ralph status` command to display loop progress
- [x] Add `ralph history` command for iteration review
- [x] Add `ralph pause` command for graceful interruption
- [x] Add `ralph resume` command to continue from checkpoint
- [x] Register ralph subcommand in main CLI

## Phase 4: MCP Server Integration ✅

- [x] Add `rulebook_ralph_init` MCP tool
- [x] Add `rulebook_ralph_run` MCP tool
- [x] Add `rulebook_ralph_status` MCP tool
- [x] Add `rulebook_ralph_get_iteration_history` MCP tool
- [x] Update MCP server schema and error handling

## Phase 5: Configuration and Storage ✅

- [x] Consolidate directory structure to `.rulebook/` with `memory/` and `ralph/` subdirectories
- [x] Extend `.rulebook` schema with ralph configuration section (already in config-manager.ts)
- [x] Create `.rulebook/ralph/` directory structure setup (in ralph-manager.ts)
- [x] Implement prd.json generation and persistence (in prd-generator.ts + cli commands)
- [x] Implement progress.txt append-only logging (in ralph-manager.ts appendProgress)
- [x] Create history/ directory for per-iteration metadata (in iteration-tracker.ts)

## Phase 6: Documentation ✅

- [x] Create `templates/core/RALPH.md` documentation
- [x] Add Ralph usage examples to AGENTS.md
- [x] Document task sizing guidelines and iteration patterns
- [x] Update CHANGELOG.md with Ralph feature addition

## Phase 7: Testing

- [ ] Write tests for ralph-manager iteration logic
- [ ] Write tests for prd-generator task conversion
- [ ] Write tests for iteration-tracker history
- [ ] Write tests for ralph-parser output extraction
- [ ] Write integration tests for full ralph run cycle
- [ ] Verify coverage meets 95%+ threshold

## Phase 8: Validation

- [ ] Run `npm run lint` with no errors
- [ ] Run `npm run type-check` with no errors
- [ ] Run `npm run test` with all tests passing
- [ ] Run `npm run test:coverage` and verify 95%+ lines covered
- [ ] Validate task with `rulebook task validate integrate-ralph-autonomous-loop`
- [ ] Manual testing: `rulebook ralph init` on test project
- [ ] Manual testing: `rulebook ralph run --max-iterations 3` complete loop
