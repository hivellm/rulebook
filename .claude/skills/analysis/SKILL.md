---
name: analysis
description: Create structured analyses with numbered findings, execution plans, and task materialization
model: opus
context: fork
agent: researcher
---
Create a structured analysis for: $ARGUMENTS

Steps:
1. Call `rulebook_analysis_create` with the topic to scaffold `docs/analysis/<slug>/`
2. Check existing knowledge: `rulebook_knowledge_list` and `rulebook_memory_search` for prior context
3. Investigate the topic — read relevant files, search codebase, fetch docs as needed
4. Fill `findings.md` with numbered findings (F-001..F-NNN), each with: title, evidence (file:line), impact, confidence
5. Design phased execution plan in `execution-plan.md`
6. Consolidate the executive summary in `README.md`
7. Capture each key finding to the knowledge base: `rulebook_knowledge_add` for patterns/anti-patterns
8. Save analysis summary to memory: `rulebook_memory_save` with type `observation` and tags `["analysis", "<slug>"]`
9. Offer to materialize implementation tasks from the execution plan via `rulebook_task_create`
