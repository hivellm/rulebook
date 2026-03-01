# Tasks: PLANS.md Session Scratchpad Pattern

- [x] Write `templates/core/PLANS.md` template with structured sections
- [x] Create `src/core/plans-manager.ts` module with read/write/init/clear/append helpers
- [x] Create PLANS.md during `rulebook init` (non-overwriting)
- [x] Ensure PLANS.md exists during `rulebook update` (non-overwriting)
- [x] Write `plans show` CLI command to display current PLANS.md
- [x] Write `plans init` CLI command to create PLANS.md
- [x] Write `plans clear` CLI command to reset PLANS.md to template
- [x] Register `plans` subcommand in `src/index.ts`
- [x] Write test: PLANS.md created during init
- [x] Write test: initPlans does not overwrite existing file
- [x] Write test: updatePlansContext updates Active Context section
- [x] Write test: appendPlansHistory adds entries in order
- [x] Write test: clearPlans resets to template
- [x] Run full test suite (830 tests passing)
- [ ] Add reference to PLANS.md in AGENTS.md template
- [ ] Inject PLANS.md context into Ralph iteration prompt prefix
