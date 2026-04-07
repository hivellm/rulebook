# 02 — Insights from `llm-ir-debugging` Papers

Source: `F:\Node\hivellm\tml\docs\papers\llm-ir-debugging\paper.md` (TOC + key findings) and `sections/09-conclusion.md`. Read in full: 82-line index + 11 section files.

## 2.1 Concrete findings

| # | Finding | Citation | Rulebook v5.3.0 implication |
|---|---------|----------|------------------------------|
| 1 | LLMs are **test-centric** (52.7% of tool calls). Prefer pass/fail to diagnostic reasoning. | §5 Results | Rulebook should *front-load* diagnostic tools in generated CLAUDE.md and make `check`-style commands default in the "Commands" section, above `test`. |
| 2 | A single prompt rule ("check before test") raised adoption from **8.8% → 25.3% in 10 days** — accelerating, not plateauing. | §5–6 | **Directive templates work.** Rulebook should ship a "diagnostic-first" directive in `templates/core/QUALITY_ENFORCEMENT.md` and auto-inject it when a type-checker is detected. |
| 3 | **Default-on features reach 95.7% adoption; opt-in reach 11.1%** despite explicit rules. | §6 | Rulebook should generate config so diagnostic tools are *default-enabled*, not documented as "optional". E.g., pre-commit should run `type-check` unconditionally. |
| 4 | A structural shift from trial-and-error toward diagnostic reasoning takes **~30 days** of sustained prompting. | §6 | Knowledge base and `rulebook learn` become critical — they are how the shift is sustained across sessions. Argues for Session 1 of v5.3.0 prioritizing the memory/imports refactor. |
| 5 | **Tool latency dominates** (37 s/test call, 52.7% of calls → primary bottleneck). JIT (~2s) projected to cut cycle from 42s → 7s. | §5 | Rulebook should warn when pre-commit hooks run slow test suites; suggest `--changed` / incremental modes. Add a `rulebook doctor --perf` check. |
| 6 | Subagents repeat the same failed approach until told to stop; **"fail twice → open team"** is effective (UzEngine RULE -3 is a field instance). | §6 discussion + UzEngine CLAUDE.md | Ship this as a built-in rule: `.claude/rules/fail-twice-escalate.md`. |
| 7 | Recommendation: instrument MCP servers for longitudinal data. | §9.2 | rulebook MCP server should (optionally) record tool-call frequency to `.rulebook/telemetry/` — locally, opt-in — so projects can run the paper's analysis on themselves. |

## 2.2 The meta-lesson

The paper is evidence that **rulebook's thesis works**: prompt-level interventions produce measurable, compounding behavior change. v5.3.0 should lean into this rather than adding more CLI surface area.
