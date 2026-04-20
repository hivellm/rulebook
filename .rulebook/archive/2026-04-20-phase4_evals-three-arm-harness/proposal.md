# Proposal: phase4_evals-three-arm-harness

Source: docs/analysis/caveman/03-evaluation.md

## Why

Rulebook ships 8+ rule files and 18+ skills with zero quantitative evidence that any specific rule is doing work. Comparing a skill's output to a no-skill baseline is the naive metric — it conflates the skill's effect with the general effect of asking the model to be concise. The honest comparison is `skill vs terse-baseline`, not `skill vs nothing`. The three-arm harness forces that comparison. Separating expensive snapshot generation (LLM calls) from cheap offline measurement (tiktoken) means CI can re-measure without API credentials, and any skill whose lift over the `terse` arm is negligible is flagged for review or deletion.

## What Changes

- `evals/` directory: `prompts/en.txt` (one prompt per line), `arms.json` (baseline/terse/skill definitions), `llm_run.ts` (snapshot generator — needs API access), `measure.ts` (offline tiktoken measurement), `report.ts` (Markdown delta table), `snapshots/results.json` (committed).
- Honest delta reported: `skill vs terse`, with raw baseline numbers for reference.
- Add `rulebook_evals_run` and `rulebook_evals_measure` MCP tools (expensive vs cheap split).
- Add doctor check: snapshot freshness (fail if >30 days old), skill lift over `terse` ≥ review threshold.

## Impact

- Affected specs: `.rulebook/specs/rulebook-terse/spec.md` (ADDED eval contract)
- Affected code: `evals/*` (new), `src/mcp/rulebook-server.ts`, `src/core/doctor.ts`
- Breaking change: NO
- User benefit: Quantitative evidence per skill; CI catches regressions; flag for dead-weight rules.
