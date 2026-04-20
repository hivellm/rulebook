## 1. Implementation
- [ ] 1.1 Create `evals/arms.json` with baseline/terse/skill definitions
- [ ] 1.2 Create `evals/prompts/en.txt` with representative prompts (≥10)
- [ ] 1.3 Create `evals/llm_run.ts` snapshot generator (uses Anthropic SDK)
- [ ] 1.4 Create `evals/measure.ts` offline tokenizer with tiktoken
- [ ] 1.5 Create `evals/report.ts` Markdown delta table output
- [ ] 1.6 Commit `evals/snapshots/results.json` from initial run
- [ ] 1.7 Register `rulebook_evals_run` MCP tool (expensive path)
- [ ] 1.8 Register `rulebook_evals_measure` MCP tool (offline path)
- [ ] 1.9 Add doctor check: snapshot freshness + per-skill lift threshold

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass
