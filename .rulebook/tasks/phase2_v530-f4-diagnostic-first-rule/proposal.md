# Proposal: F4 — Diagnostic-first directive injector

Source: [docs/analysis/v5.3.0/02-papers.md](../../../docs/analysis/v5.3.0/02-papers.md) finding #2

## Why
The llm-ir-debugging paper documented that LLMs are test-centric (52.7% of tool calls) and skip diagnostic tools. A single prompt rule "check before test" raised adoption from 8.8% → 25.3% in 10 days (accelerating). Rulebook should ship this as a default rule whenever a type-checker is detected.

## What Changes
- New `templates/rules/diagnostic-first.md` with the check-before-test rule and the quantitative justification (cite paper §5–6).
- Detector integration: auto-enable when a type-checker is found (tsc, mypy, cargo check, rustc, cmake, go vet, etc.).
- The rule is generated with `paths:` scoped to source files of the detected language.

## Impact
- Affected specs: `templates/rules/diagnostic-first.md` (new)
- Affected code: `src/core/detector.ts`, `src/core/rules-generator.ts` (from F2)
- Breaking change: NO
- User benefit: ~3x adoption of diagnostic-first behavior, fewer wasted test cycles
