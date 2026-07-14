# /analysis — Structured analysis workflow

Create a structured analysis for a topic in `docs/analysis/<slug>/`, **always
split into numbered files, one theme per file**.

## Usage

```
/analysis <topic>
```

## Structure (mandatory)

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

## What it does

1. Slugifies the topic (e.g. "Auth Refactor v2" → `auth-refactor-v2`)
2. Creates `docs/analysis/<slug>/` following the structure above
3. Investigates the topic and writes one numbered file per theme
4. Consolidates the executive summary + index in `README.md`

## After the analysis

1. Create implementation tasks from the plan: `rulebook task create phase1_<slug>-<name>`
2. Each task should reference the analysis: `Source: docs/analysis/<slug>/`
3. Capture key findings: `rulebook_memory {action:"add"}` tagged `analysis:<slug>`
4. Before implementing, consult prior context: `rulebook_memory {action:"list"}`
