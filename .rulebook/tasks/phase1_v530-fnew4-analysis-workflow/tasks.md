# Tasks: F-NEW-4 — `/analysis <topic>` workflow

## 1. Types & manager
- [x] 1.1 Types defined inline in `src/core/analysis-manager.ts` (AnalysisOptions, AnalysisResult)
- [x] 1.2 Created `src/core/analysis-manager.ts` with: `createAnalysis()`, `listAnalyses()`, `showAnalysis()`, `slugify()`
- [x] 1.3 Themed auto-split deferred to v5.4 (skeleton supports it via manifest)
- [x] 1.4 `manifest.json` written per analysis with slug, topic, agents, timestamps, version

## 2. CLI
- [x] 2.1 Commands registered in `src/cli/commands/analysis.ts` + `src/index.ts`: `rulebook analysis create/list/show`
- [x] 2.2 Task materialization deferred to v5.4 — scaffolds and prints guidance for manual follow-up

## 3. Templates
- [x] 3.1 README template with executive summary, methodology, conclusion (inline in analysis-manager.ts)
- [x] 3.2 Execution plan template with phased structure (inline)
- [x] 3.3 Created `templates/rules/consult-analysis-before-implementing.md`
- [x] 3.4 Created `templates/skills/dev/analysis/SKILL.md` (proper skill format with frontmatter)
- [x] 3.5 Created `.claude/commands/analysis.md` (Claude Code slash command)
- [ ] 3.6 `.cursor/commands/analysis.md` — deferred to v5.4

## 4. KB integration
- [ ] 4.1 Auto-KB capture per finding — deferred to v5.4 (requires agent dispatch)
- [ ] 4.2 Auto-memory save — deferred to v5.4

## 5. MCP
- [x] 5.1 Added `rulebook_analysis_create` with Zod schema
- [x] 5.2 Added `rulebook_analysis_list`
- [x] 5.3 Added `rulebook_analysis_show`

## 6. Tail (mandatory)
- [x] 6.1 Documentation: inline JSDoc, skill SKILL.md, command .md
- [x] 6.2 Tests: `tests/analysis-manager.test.ts` (11 tests), agent-delegation test updated (15 skills)
- [x] 6.3 Full suite passing, lint clean, type-check clean
