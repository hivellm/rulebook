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

## Current status (phase 0 smoke test)

This is a scaffold to validate the harness shape end-to-end before phase 4 lands the full Anthropic-API + `tiktoken` integration. Right now:

- `arms.json` and `prompts/en.txt` have minimal fixture data (3 prompts, 3 arms).
- `snapshots/results.json` is a hand-authored fixture — not a real API snapshot.
- `measure.ts` uses byte counts as a stand-in for token counts. Phase 4 replaces this with `tiktoken`.
- `llm_run.ts` + `report.ts` are deferred to phase 4.

Running `measure.ts` on the fixture should produce a sensible per-arm table, demonstrating the shape of the CI-facing comparison.

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
