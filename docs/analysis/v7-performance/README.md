# v7.0.0 Performance Analysis — Rulebook as Assistant, Not Anchor

**Date**: 2026-07-14
**Scope**: Full-stack overhead audit of Rulebook v6.0.0 as experienced by a modern
frontier model (Claude Fable 5 / Opus 4.x) inside Claude Code.
**Branch**: `release/v7.0.0`

## Executive summary

Rulebook's cost is real and measurable, but the dominant cost is **not** hook
latency or MCP startup — it is **prompt weight + process ceremony + rule
contradictions** that force the model to spend turns and attention on Rulebook
itself instead of the user's task. The single worst offense: v6 **actively blocks
the native subagent orchestration** that Fable-class models use as a core working
style (background-agent denial hook, mandatory delegation table).

v7.0.0 inverts the design philosophy — from *babysitting the model* to *assisting
the model*. Mission: run **complementary to Opus and Fable**, never as an anchor.
Simple, clear rules; only what is important; nothing stuffing the context.

Headline numbers (measured, see [01](01-measured-overhead.md)):

| Metric | v6.0.0 default | v7.0.0 target |
|---|---:|---:|
| Static context per session | ~14,900 tok | ≤2,500 tok (−83%) |
| Model turns of ceremony per small task | 10–14 | 0–2 |
| Hook spawns on hot paths (per turn) | 2–4 | 0–1 |
| MCP tools / schema tokens | 26 / ~3,500 | 8 / ≤900 |
| Rule files | 19 | 1 |

## Files

| File | Theme | Findings |
|---|---|---|
| [01-measured-overhead.md](01-measured-overhead.md) | Measured overhead: context, hooks, MCP, footprint | F-001..F-004 |
| [02-behavioral-conflicts.md](02-behavioral-conflicts.md) | How v6 fights modern models (the dominant cost) | F-005..F-010 |
| [03-design-principles.md](03-design-principles.md) | v7 design principles (P0: never block orchestration) | — |
| [04-v7-specification.md](04-v7-specification.md) | Concrete v7 spec: context, hooks, MCP, process, assets, migration | — |
| [05-budget-and-metrics.md](05-budget-and-metrics.md) | Budgets, acceptance metrics + **live impact ledger** (one row per change) | — |
| [06-draft-directives.md](06-draft-directives.md) | Draft v7 CLAUDE.md + single rules file (concrete text) | — |
| [07-execution-plan.md](07-execution-plan.md) | Phased execution plan (rulebook tasks) | — |

## Methodology

Measurements taken on Windows 10 (warm caches) against this repository and a fresh
`rulebook init --yes --tools claude-code` TypeScript project: tiktoken (gpt-4
encoder) over generated files; MCP timed via stdio JSON-RPC `initialize` +
`tools/list`; spawn latency via 5-run averages of `bash -c "exit 0"` and
bash+node.

## Conclusion

v6's guardrails were designed for weaker models that needed protection against
losing context and wandering off-task. Frontier models ship those capabilities
natively — planning, parallel subagent fan-out, context compaction, verbosity
control. Every v6 mechanism that scripts or blocks these now *subtracts*
performance. v7 keeps what the model cannot discover on its own (project facts,
values, safety rails, durable task/knowledge state on disk) and deletes
everything that competes with the model's own judgment.
