# Rulebook Evals — Three-Arm Harness

Source: `docs/analysis/caveman/03-evaluation.md`

Skill / rule changes are measured against three arms:

| Arm | System prompt |
|-----|---------------|
| `baseline` | (none) |
| `terse` | `Answer concisely. No preamble, no restating the question.` |
| `rulebook-terse` | `Answer concisely.` + content of the SKILL.md under test |

The honest delta is **`rulebook-terse` vs `terse`**, not vs `baseline`. Comparing to baseline would conflate the skill's effect with the general effect of asking for brevity — generic concise-instruction is already baked into the skill arm.

## Layout

```
evals/
├── README.md                       # this file
├── arms.json                       # arm definitions
├── prompts/
│   └── en.txt                      # one prompt per line
├── snapshots/
│   └── results.json                # committed snapshots (regenerated manually)
├── llm_run.ts                      # TODO (phase 4): snapshot generator — needs API access
├── measure.ts                      # offline measurement — counts tokens per arm
└── report.ts                       # TODO (phase 4): Markdown delta-table output
```

## Status

Phase 4 complete. The harness is fully wired:

- `arms.json` defines three arms + `liftThreshold` + `honestDelta`.
- `prompts/en.txt` has 10 representative prompts (add to this file to
  extend coverage).
- `snapshots/results.json` is a hand-authored fixture for the initial
  commit. Regeneration is done by `llm_run.ts` + the
  `evals-snapshot` GitHub Actions workflow (both require
  `ANTHROPIC_API_KEY`).
- `measure.ts` uses `tiktoken` when installed (`npm i --save-dev tiktoken`
  or `npm install --no-save tiktoken` in CI) and falls back to UTF-8
  byte counts otherwise. Ratios between arms are stable in both modes;
  absolute numbers are approximate only in byte-count mode.
- `report.ts` emits a Markdown table consumed by the PR-comment bot.
- `evals-measure.yml` gates every PR touching terse source files on the
  skill-vs-terse lift threshold.

## Running the smoke test

```bash
npx tsx evals/measure.ts
```

Expected output: a per-prompt table with three columns (`baseline`, `terse`, `rulebook-terse`) and savings-over-`terse` percentages.

## Regenerating snapshots (phase 4)

```bash
# Phase 4 only — needs ANTHROPIC_API_KEY
npx tsx evals/llm_run.ts
```

Phase 4 will turn this into a manual-dispatch GitHub Actions workflow so contributors can regenerate snapshots without holding credentials locally.
