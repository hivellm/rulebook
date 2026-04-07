# Tasks: F7 — rulebook doctor

## 1. Doctor module
- [x] 1.1 Created `src/core/doctor.ts` with `runDoctor(projectRoot): Promise<DoctorReport>`
- [x] 1.2 Check: CLAUDE.md size vs 200-line budget
- [x] 1.3 Check: AGENTS.md size vs 6000-line budget
- [x] 1.4 Check: orphaned rules (count of .claude/rules/*.md files)
- [x] 1.5 Check: override conflicts (AGENTS.override.md presence detection)
- [x] 1.6 Check: stale STATE.md (>14 days since modification)
- [x] 1.7 Check: broken `@imports` (target file missing)
- [x] Added: Required files check (CLAUDE.md, AGENTS.md, .rulebook/rulebook.json)

## 2. CLI / MCP
- [x] 2.1 Registered `rulebook doctor` CLI subcommand in `src/cli/commands/analysis.ts` + `src/index.ts`
- [x] 2.2 Added `rulebook_doctor_run` MCP tool in `src/mcp/rulebook-server.ts`
- [x] 2.3 Auto-runs post-update in `src/cli/commands/update.ts` — prints warnings for non-pass checks

## 3. Tail (mandatory)
- [x] 3.1 Documentation: inline JSDoc
- [x] 3.2 Tests: `tests/doctor.test.ts` (6 tests)
- [x] 3.3 Full suite passing, lint clean, type-check clean
