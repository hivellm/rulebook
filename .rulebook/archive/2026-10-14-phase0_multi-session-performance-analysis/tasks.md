## 1. Implementation
- [x] 1.1 Orchestrator measurements: hooks, Jev gate, MCP chains, npx, 9router, transcripts (`00-orchestrator-measurements.md`)
- [x] 1.2 Five parallel investigations (hooks, MCP lifecycle, context + orchestration, session forensics, Codex/9router) — workflow, finished by direct hand-backs
- [x] 1.3 Draft `README.md` + `01`–`05` with globally numbered findings F-001..
- [x] 1.4 External panel: Codex (gpt-6-astra), gpt-6.1-sol, Claude Opus 5.5 answered; grok-4.6 and kimi-k3 unreachable (9router upstream 502) — `06-model-panel.md`
- [x] 1.5 Synthesis (Fable 5.1): `06-model-panel.md`, `07-recommendations.md`, `08-execution-plan.md`, final `README.md`
- [x] 1.6 Critic pass: numbers traceable, F-numbers unique, links resolve, non-rulebook causes separated
- [x] 1.7 Materialize the execution plan as rulebook tasks for v7.5.0 on branch `release/v7.5.0`; capture learnings (`rulebook_memory`, tag `analysis:multi-session-performance`)
- [x] 1.8 Commit the analysis on `release/v7.5.0`

## 2. Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (the analysis README is the documentation and index; `docs/analysis/00-INDEX.md` belongs to the 2026-03 analysis and was left alone)
- [ ] 2.2 Write tests covering the new behavior (waived: analysis task, no code)
- [ ] 2.3 Run tests and confirm they pass (waived: analysis task, no code)

<!-- tail-waiver: Analysis-only task: no product code changed, so there is nothing to test; the analysis files in docs/analysis/multi-session-performance/ are the documentation. Implementation tests live in the 13 phase1–phase4 tasks. -->
