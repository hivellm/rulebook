# Tasks: F7 — rulebook doctor

## 1. Doctor module
- [ ] 1.1 Create `src/core/doctor.ts` with `runDoctor(projectRoot): DoctorReport`
- [ ] 1.2 Check: CLAUDE.md size vs 200-line budget, with split suggestion
- [ ] 1.3 Check: `.claude/rules/*.md` size vs budget
- [ ] 1.4 Check: orphaned rules (not referenced anywhere)
- [ ] 1.5 Check: conflicting directives between AGENTS.md and AGENTS.override.md
- [ ] 1.6 Check: stale STATE.md (>14 days since modification)
- [ ] 1.7 Check: broken `@imports` (target file missing)

## 2. CLI / MCP
- [ ] 2.1 Register `rulebook doctor` in `src/cli/commands.ts`
- [ ] 2.2 Add `rulebook_doctor_run` MCP tool
- [ ] 2.3 Auto-invoke `runDoctor` after `rulebook update` and print summary

## 3. Tail (mandatory)
- [ ] 3.1 Update or create documentation covering the implementation
- [ ] 3.2 Write tests covering the new behavior (`tests/doctor.test.ts` per check)
- [ ] 3.3 Run tests and confirm they pass
