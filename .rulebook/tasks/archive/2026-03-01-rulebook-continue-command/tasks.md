# Tasks: `rulebook continue` — Session Continuity Command

- [x] Create `src/core/plans-manager.ts` module with read/write/init/clear/append helpers
- [x] Create `templates/core/PLANS.md` template with structured sections
- [x] Write `plans show` CLI command to display current PLANS.md
- [x] Write `plans init` CLI command to create PLANS.md
- [x] Write `plans clear` CLI command to reset PLANS.md to template
- [x] Register `plans` subcommand in `src/index.ts`
- [x] Write `continueCommand()` aggregating context from PLANS.md, tasks, git log, Ralph, branch
- [x] Register `continue` command in `src/index.ts`
- [x] Create PLANS.md during `rulebook init` (non-overwriting)
- [x] Ensure PLANS.md exists during `rulebook update` (non-overwriting)
- [x] Write tests for plans-manager (12 tests)
- [x] Run full test suite (830 tests passing)
- [x] Add reference to PLANS.md in AGENTS.md template (generator.ts + AGENTS_LEAN.md)
- [x] Inject PLANS.md context into Ralph iteration prompt prefix
