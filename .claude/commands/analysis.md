# /analysis — Structured analysis workflow

Create a structured analysis for a topic. Scaffolds `docs/analysis/<slug>/` with skeleton files (README.md, findings.md, execution-plan.md, manifest.json).

## Usage

```
/analysis <topic>
```

## What it does

1. Slugifies the topic (e.g. "Auth Refactor v2" → `auth-refactor-v2`)
2. Creates `docs/analysis/<slug>/` with:
   - **README.md** — executive summary, methodology, conclusion
   - **findings.md** — numbered findings F-001..F-NNN (title, evidence, impact, confidence)
   - **execution-plan.md** — phased implementation plan
   - **manifest.json** — metadata (agents, timestamps, version)
3. Idempotent: re-running updates manifest but preserves user-edited content files

## After scaffolding

1. Fill `findings.md` with investigation results
2. Design the phases in `execution-plan.md`
3. Create implementation tasks from the plan: `rulebook task create phase1_<slug>-<name>`
4. Each task should reference the analysis: `Source: docs/analysis/<slug>/README.md#F-NNN`
5. Before implementing, consult the knowledge base: `rulebook_knowledge_list` filtered by `analysis:<slug>`

## MCP equivalent

```
rulebook_analysis_create({ topic: "<topic>" })
rulebook_analysis_list()
rulebook_analysis_show({ slug: "<slug>" })
```
