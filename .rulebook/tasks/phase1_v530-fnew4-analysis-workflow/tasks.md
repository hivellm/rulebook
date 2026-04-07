# Tasks: F-NEW-4 — `/analysis <topic>` workflow

## 1. Types & manager
- [ ] 1.1 Create `src/core/analysis-types.ts` (`AnalysisRun`, `Finding`, `ExecutionPhase`, `AnalysisAgent`)
- [ ] 1.2 Create `src/core/analysis-manager.ts` orchestrating: scaffold, agent dispatch, consolidation, task gen, KB capture
- [ ] 1.3 Implement themed auto-split when consolidated README exceeds 400 lines
- [ ] 1.4 Write `manifest.json` per analysis (agents, prompts, model versions, timestamps)

## 2. CLI
- [ ] 2.1 Create `src/cli/commands/analysis.ts` registering `rulebook analysis <topic> [--agents <list>] [--no-tasks]`
- [ ] 2.2 Default behavior is gated: generate plan, prompt user, then materialize tasks on confirm

## 3. Templates
- [ ] 3.1 `templates/core/ANALYSIS_README_TEMPLATE.md` (numbered findings format)
- [ ] 3.2 `templates/core/EXECUTION_PLAN_TEMPLATE.md` (phased plan)
- [ ] 3.3 `templates/rules/consult-analysis-before-implementing.md`
- [ ] 3.4 `templates/skills/analysis.md`
- [ ] 3.5 `.claude/commands/analysis.md` (Claude Code slash command)
- [ ] 3.6 `.cursor/commands/analysis.md` (Cursor equivalent)

## 4. KB integration
- [ ] 4.1 For each finding, call `rulebook_knowledge_add` / `rulebook_learn_capture` / `rulebook_decision_create` as appropriate, tagged `analysis:<slug>`
- [ ] 4.2 `rulebook_memory_save` with `type: analysis` and the consolidated README content

## 5. MCP
- [ ] 5.1 Add `rulebook_analysis_create` (mirrors CLI)
- [ ] 5.2 Add `rulebook_analysis_list`
- [ ] 5.3 Add `rulebook_analysis_show`

## 6. Tail (mandatory)
- [ ] 6.1 Update or create documentation covering the implementation
- [ ] 6.2 Write tests covering the new behavior (`tests/analysis-manager.test.ts`, `tests/analysis-cli.test.ts`)
- [ ] 6.3 Run tests and confirm they pass
