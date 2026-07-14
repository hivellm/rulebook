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

## Final results (v7.0.0 shipped — full ledger in [05](05-budget-and-metrics.md))

| Metric | v6.0.0 baseline | v7.0.0 target | **v7.0.0 shipped** |
|---|---:|---:|---:|
| Static context per session | 14,951 tok | ≤2,500 tok | **3,397 tok (−77%)** ¹ |
| MCP tools / schema bytes | 26 / 13,965 B | ≤8 / ≤3,600 B | **5 / 3,592 B ✔** |
| Hook entries (full desire set) | 7 across 5 events | 0–1 | **1 path-only guard ✔** |
| Default install | 95 files | ~15 | **29 files** ² |
| On-demand specs | ~29,900 tok | — | **~2,300 tok (−92%)** |
| Session-start ceremony | 4–5 calls | 1 | **1 call ✔** |
| Orchestration denials | every untagged dispatch | never | **never (P0, tested) ✔** |
| Permission prompts (routine ops) | most mutating ops | ~0 | **0 ✔** |

¹ 3,397 = 1,714 file-based always-loaded + ~550 path-scoped language rules
(load only for matching files) + ~900 MCP schemas (deferred-capable clients
pay ~0 until first use). The strict file-based budget (≤1,600) is enforced in
CI by `tests/context-budget.test.ts`.
² 12 of the 29 are the `/rulebook-*` command docs; trimming them below ~15
total is possible but was judged not worth losing the discoverability.

All five phases of [07-execution-plan.md](07-execution-plan.md) plus the
session-hygiene follow-up (docs/analysis/session-auto-cleanup/) are
implemented, tested (841 tests) and enforced by CI acceptance checks
(`tests/context-budget.test.ts`, `tests/claude-settings-manager.test.ts`,
`tests/v7-budgets.test.ts`). Migration: `rulebook update --dry-run` →
[docs/guides/migration-v6-to-v7.md](../../guides/migration-v6-to-v7.md).

## Files

| File | Theme | Findings |
|---|---|---|
| [01-measured-overhead.md](01-measured-overhead.md) | Measured overhead: context, hooks, MCP, footprint | F-001..F-004 |
| [02-behavioral-conflicts.md](02-behavioral-conflicts.md) | How v6 fights modern models (the dominant cost) | F-005..F-011 |
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
