# Proposal: F-NEW-4 — `/analysis <topic>` command + skill

Source: [docs/analysis/v5.3.0/07-analysis-workflow.md](../../../docs/analysis/v5.3.0/07-analysis-workflow.md)

## Why
Every "analyze X" request currently produces ad-hoc notes. Codifying a repeatable workflow (the same one that produced the v5.3.0 analysis directory) means every investigation accumulates into the knowledge base, and future implementations consult prior findings before writing code.

## What Changes
- New CLI: `rulebook analysis <topic> [--agents <list>] [--no-tasks]`.
- Workflow: scaffold `docs/analysis/<slug>/` (themed split when >400 lines), dispatch agents in parallel, consolidate into numbered findings F-001..F-NNN, generate `execution-plan.md`, materialize tasks (gated by user confirm), capture each finding into the KB tagged `analysis:<slug>`.
- New rule `templates/rules/consult-analysis-before-implementing.md` forces `knowledge_search` + `memory_search` for `analysis:<slug>` before any task with that source.
- New MCP tools: `rulebook_analysis_create`, `rulebook_analysis_list`, `rulebook_analysis_show`.
- New skill: `templates/skills/analysis.md` for `/analysis`.
- Idempotent re-run, auditable (`discovered-by`, `confidence`), replayable (`manifest.json`).

## Impact
- Affected specs: `templates/core/ANALYSIS_README_TEMPLATE.md`, `templates/core/EXECUTION_PLAN_TEMPLATE.md`, `templates/rules/`, `templates/skills/` (all new)
- Affected code: `src/cli/commands/analysis.ts`, `src/core/analysis-manager.ts`, `src/core/analysis-types.ts`, `src/mcp/rulebook-server.ts`
- Breaking change: NO
- User benefit: every analysis compounds the project's institutional memory instead of being thrown away
