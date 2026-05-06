## 1. Source code removal
- [ ] 1.1 Delete `src/agents/ralph-parser.ts`
- [ ] 1.2 Delete `src/cli/commands/ralph.ts` and unregister it from `src/cli/commands/index.ts`
- [ ] 1.3 Delete `src/core/ralph-manager.ts`, `src/core/ralph-parallel.ts`, `src/core/ralph-plan-checkpoint.ts`, `src/core/ralph-scripts.ts`
- [ ] 1.4 Strip Ralph type definitions and cross-references from `src/types.ts`, `src/core/generator.ts`, `src/core/config-manager.ts`, `src/core/state-writer.ts`, `src/core/prd-generator.ts`, `src/core/iteration-tracker.ts`, `src/core/health-scorer.ts`, `src/index.ts`
- [ ] 1.5 Remove `rulebook_ralph_*` tool registrations from `src/mcp/rulebook-server.ts`

## 2. Test suite cleanup
- [ ] 2.1 Delete `tests/ralph.test.ts`, `tests/ralph-parallel.test.ts`, `tests/ralph-parser-fixes.test.ts`, `tests/ralph-plan-checkpoint.test.ts`, `tests/ralph-context-compression.test.ts`, `tests/ralph-memory-integration.test.ts`, `tests/ralph-scripts.test.ts`
- [ ] 2.2 Remove Ralph fixture references from any remaining tests (e.g. `agent-manager-comprehensive.test.ts`)
- [ ] 2.3 Re-run the full suite and confirm no orphaned imports remain

## 3. Templates and scripts
- [ ] 3.1 Delete `templates/ralph/` directory in full
- [ ] 3.2 Delete `.rulebook/scripts/ralph-*.sh` and `.rulebook/scripts/ralph-*.bat`
- [ ] 3.3 Delete `templates/ides/cursor-mdc/ralph.mdc` and `.cursor/rules/ralph.mdc`
- [ ] 3.4 Remove the `ralph` slash commands: `.claude/commands/ralph-{init,run,status,history,pause-resume,config}.md`
- [ ] 3.5 Update `src/cli/commands/init.ts` so a fresh install does not scaffold any Ralph artifact

## 4. Documentation
- [ ] 4.1 Remove the "Ralph Autonomous Loop" section from `AGENTS.md` and from `templates/AGENTS.md`
- [ ] 4.2 Remove Ralph references from `README.md`
- [ ] 4.3 Add a `## Removed` entry in `CHANGELOG.md` describing the deprecation
- [ ] 4.4 Update `.rulebook/specs/RULEBOOK.md`, `.rulebook/specs/AGENT_AUTOMATION.md`, `.rulebook/specs/RULEBOOK_MCP.md` to drop Ralph mentions
- [ ] 4.5 Update token-optimization / delegation tables that reference Ralph

## 5. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 5.1 Update or create documentation covering the implementation
- [ ] 5.2 Write tests covering the new behavior
- [ ] 5.3 Run tests and confirm they pass
