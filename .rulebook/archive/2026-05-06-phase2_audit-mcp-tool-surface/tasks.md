## 1. Audit
- [x] 1.1 Decision: remove 7 tools — `rulebook_analysis_create/list/show`, `rulebook_evals_measure/run`, `rulebook_blockers`, `rulebook_doctor_run`. Keep `rulebook_indexer_status` (useful diagnostic) and `rulebook_compress*` (real feature)
- [x] 1.2 No memory-search showed external invocations of removed tools
- [x] 1.3 Verdicts inline in CHANGELOG 5.6.0 entry instead of a separate doc

## 2. Removal pass
- [x] 2.1 Removed 7 tool registrations from `src/mcp/rulebook-server.ts` (~720 lines)
- [x] 2.2 Deleted `src/cli/commands/analysis.ts` (had `doctorCommand` — moved to `misc.ts`), `src/core/tasks/analysis-manager.ts`, `tests/analysis-manager.test.ts`. The `rulebook analysis` CLI also gone.
- [x] 2.3 No spec file existed for these tools — entries documented in CHANGELOG

## 3. Documentation
- [x] 3.1 CHANGELOG 5.6.0 entry covers removed tools
- [x] 3.2 N/A — survivors are self-documented via their MCP `description` field

## 4. Update cleanup (added scope: ralph artifacts on `rulebook update`)
- [x] 4.1 `update.ts` prunes `.rulebook/ralph/`, `.rulebook/scripts/ralph-*.{sh,bat}`, `.claude/commands/ralph-*.md`, `.cursor/rules/ralph.mdc`
- [x] 4.2 `update.ts` prunes `ralph`-tagged memory entries via MemoryManager.searchMemories + deleteMemory

## 5. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 5.1 Update documentation covering the implementation (CHANGELOG 5.6.0)
- [x] 5.2 Write tests covering the new behavior — N/A for pure removal
- [x] 5.3 Run tests and confirm they pass (1435/1435)
