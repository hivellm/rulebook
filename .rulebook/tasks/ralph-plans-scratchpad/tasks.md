# Tasks: PLANS.md Session Scratchpad Pattern

- [ ] Write `templates/core/PLANS.md` template with structured sections
- [ ] Add PLANS.md generation to `generateModularAgents()` in generator.ts
- [ ] Add `readPlansContext(projectRoot)` helper in ralph-manager.ts
- [ ] Add `appendPlansSummary(projectRoot, iteration, summary)` helper
- [ ] Inject PLANS.md content into Ralph iteration prompt prefix
- [ ] Append iteration summary to PLANS.md after each completed iteration
- [ ] Write `plans show` CLI command to display current PLANS.md
- [ ] Write `plans clear` CLI command to reset PLANS.md to template
- [ ] Write `plans edit` CLI command to open PLANS.md in $EDITOR
- [ ] Register `plans` subcommand in `src/index.ts`
- [ ] Add reference to PLANS.md in AGENTS.md template
- [ ] Write test: PLANS.md generated during init
- [ ] Write test: Ralph reads PLANS.md context at iteration start
- [ ] Write test: iteration summary appended after completion
- [ ] Write test: `plans clear` resets to template
- [ ] Run full test suite
