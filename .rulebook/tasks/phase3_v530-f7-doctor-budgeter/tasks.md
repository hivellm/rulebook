# Tasks: F7 — rulebook doctor

## 1. Doctor module
- [x] 1.1 Created `src/core/doctor.ts` with `runDoctor(projectRoot): Promise<DoctorReport>`
- [x] 1.2 Check: CLAUDE.md size vs 200-line budget, with split suggestion
- [x] 1.3 Check: AGENTS.md size vs 6000-line budget
- [x] 1.4 Check: orphaned rules (count of .claude/rules/*.md files)
- [x] 1.5 Check: override conflicts (AGENTS.override.md presence detection)
- [x] 1.6 Check: stale STATE.md (>14 days since modification)
- [x] 1.7 Check: broken `@imports` (target file missing)
- [x] Added: Required files check (CLAUDE.md, AGENTS.md, .rulebook/rulebook.json)

## 2. CLI / MCP
- [ ] 2.1 Register `rulebook doctor` CLI subcommand — deferred (module ready, CLI registration in next pass)
- [ ] 2.2 Add `rulebook_doctor_run` MCP tool — deferred
- [ ] 2.3 Auto-invoke after `rulebook update` — deferred

## 3. Tail (mandatory)
- [x] 3.1 Documentation: inline JSDoc
- [x] 3.2 Tests: `tests/doctor.test.ts` (6 tests: missing files, under budget, over budget, broken imports, valid imports, count correctness)
- [x] 3.3 Full suite passing, lint clean, type-check clean
