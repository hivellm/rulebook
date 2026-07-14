---
name: analysis
description: Create structured analyses with numbered findings, execution plans, and task materialization
model: opus
context: fork
agent: researcher
---
Create a structured analysis for: $ARGUMENTS

## Structure (mandatory)

Analyses live in `docs/analysis/<slug>/` and are ALWAYS split into
**numbered files, one theme per file**, in reading order:

```
docs/analysis/<slug>/
├── README.md            # index + executive summary; links every numbered file
├── 01-<theme>.md        # one theme per file (e.g. 01-measurements.md)
├── 02-<theme>.md        # (e.g. 02-root-causes.md)
├── ...
└── NN-execution-plan.md # last file, only when the analysis proposes work
```

Never put the whole analysis in a single file. Findings are numbered
F-001..F-NNN **globally across the analysis** (numbering continues from one
file to the next), each with: title, evidence (file:line), impact, confidence.

Steps:
1. Slugify the topic and create `docs/analysis/<slug>/` following the structure above
2. Check existing knowledge: `rulebook_memory` and `rulebook_memory` for prior context
3. Investigate the topic — read relevant files, search codebase, fetch docs as needed
4. Write one numbered file per theme with its findings (F-001..F-NNN)
5. When the analysis proposes work, design the phased plan in the final `NN-execution-plan.md`
6. Consolidate the executive summary + index of numbered files in `README.md`
7. Capture each key finding to the knowledge base: `rulebook_memory` for patterns/anti-patterns
8. Capture analysis learnings: `rulebook_memory` / `rulebook_memory` tagged `analysis:<slug>`
9. Offer to materialize implementation tasks from the execution plan via `rulebook_task`
