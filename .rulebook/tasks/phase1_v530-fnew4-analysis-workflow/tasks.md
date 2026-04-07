# Tasks: F-NEW-4 — `/analysis <topic>` workflow

## 1. Types & manager
- [x] 1.1 Types defined inline in `src/core/analysis-manager.ts` (AnalysisOptions, AnalysisResult — separate types file deferred to v5.4 when agent dispatch is added)
- [x] 1.2 Created `src/core/analysis-manager.ts` with: `createAnalysis()` (scaffold), `listAnalyses()`, `showAnalysis()`, `slugify()`
- [x] 1.3 Themed auto-split deferred to v5.4 (skeleton supports it via manifest)
- [x] 1.4 `manifest.json` written per analysis with slug, topic, agents, timestamps, version

## 2. CLI
- [x] 2.1 Commands registered in `src/cli/commands.ts` + `src/index.ts`: `rulebook analysis create <topic> [--agents] [--no-tasks]`, `list`, `show <slug>`
- [x] 2.2 Task materialization deferred to v5.4 — currently scaffolds and prints guidance for manual follow-up

## 3. Templates
- [x] 3.1 README template with executive summary, methodology, conclusion sections (inline in analysis-manager.ts)
- [x] 3.2 Execution plan template with phased structure (inline in analysis-manager.ts)
- [x] 3.3 Created `templates/rules/consult-analysis-before-implementing.md`
- [ ] 3.4 `templates/skills/analysis.md` — deferred to v5.4 (skill registration needs skill engine integration)
- [ ] 3.5 `.claude/commands/analysis.md` — deferred to v5.4
- [ ] 3.6 `.cursor/commands/analysis.md` — deferred to v5.4

## 4. KB integration
- [ ] 4.1 Auto-KB capture per finding — deferred to v5.4 (requires agent dispatch)
- [ ] 4.2 Auto-memory save — deferred to v5.4

## 5. MCP
- [x] 5.1 Added `rulebook_analysis_create` with Zod schema (mirrors CLI)
- [x] 5.2 Added `rulebook_analysis_list`
- [x] 5.3 Added `rulebook_analysis_show`

## 6. Tail (mandatory)
- [x] 6.1 Documentation: inline JSDoc on all exports
- [x] 6.2 Tests: `tests/analysis-manager.test.ts` (11 tests: slugify, create, idempotency, manifest update, list, show)
- [x] 6.3 Full suite passing, lint clean, type-check clean
