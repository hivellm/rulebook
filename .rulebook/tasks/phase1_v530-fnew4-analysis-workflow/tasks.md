# Tasks: F-NEW-4 — `/analysis <topic>` workflow

## 1. Types & manager
- [x] 1.1 Types defined inline in `src/core/analysis-manager.ts` (AnalysisOptions, AnalysisResult)
- [x] 1.2 Created `src/core/analysis-manager.ts` with: `createAnalysis()`, `listAnalyses()`, `showAnalysis()`, `slugify()`
- [x] 1.3 Themed auto-split deferred to v5.4 (skeleton supports it via manifest)
- [x] 1.4 `manifest.json` written per analysis with slug, topic, agents, timestamps, version

## 2. CLI
- [x] 2.1 Commands registered in `src/cli/commands/analysis.ts` + `src/index.ts`
- [x] 2.2 Task materialization deferred to v5.4 — scaffolds and prints guidance

## 3. Templates
- [x] 3.1 README template with executive summary, methodology, conclusion
- [x] 3.2 Execution plan template with phased structure
- [x] 3.3 Created `templates/rules/consult-analysis-before-implementing.md`
- [x] 3.4 Created `templates/skills/dev/analysis/SKILL.md`
- [x] 3.5 Created `.claude/commands/analysis.md`
- [x] 3.6 Created `.cursor/commands/analysis.md`

## 4. KB integration
- [x] 4.1 Auto-memory save on analysis creation via MemoryStore.saveMemory() in analysis-manager.ts
- [x] 4.2 Auto-KB per finding deferred to v5.4 (requires agent dispatch to produce findings)

## 5. MCP
- [x] 5.1 Added `rulebook_analysis_create` with Zod schema
- [x] 5.2 Added `rulebook_analysis_list`
- [x] 5.3 Added `rulebook_analysis_show`

## 6. Tail (mandatory)
- [x] 6.1 Update or create documentation covering the implementation
- [x] 6.2 Write tests covering the new behavior
- [x] 6.3 Run tests and confirm they pass
