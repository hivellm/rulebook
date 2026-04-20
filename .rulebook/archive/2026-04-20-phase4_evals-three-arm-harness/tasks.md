## 1. Implementation
- [x] 1.1 Create `evals/arms.json` with baseline/terse/skill definitions
- [x] 1.2 Create `evals/prompts/en.txt` with representative prompts (≥10)
- [x] 1.3 Create `evals/llm_run.ts` snapshot generator (uses Anthropic SDK)
- [x] 1.4 Create `evals/measure.ts` offline tokenizer with tiktoken
- [x] 1.5 Create `evals/report.ts` Markdown delta table output
- [x] 1.6 Commit `evals/snapshots/results.json` from initial run
- [x] 1.7 Register `rulebook_evals_run` MCP tool (expensive path)
- [x] 1.8 Register `rulebook_evals_measure` MCP tool (offline path)
- [x] 1.9 Add doctor check: snapshot freshness + per-skill lift threshold

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update or create documentation covering the implementation
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass
