# Multi-session performance — what the next rulebook version must change

**Date**: 2026-10-14 · **Version analysed**: 7.4.0 · **Branch**: `release/v7.5.0`
**Task**: `phase0_multi-session-performance-analysis`
**Scope**: Multi-session development slowness reported by the operator (several Claude Code and Codex
sessions open at once, all on rulebook); goal: what the next rulebook version must change.

## Verdict

1. **The v7.4 "delegate every task, including small ones" rule is the biggest cost rulebook controls.**
   Small fixes take 3.5–5.9× more model calls and 1.8–3.1× more wall time when delegated (F-022).
2. **The Jev prompt hook works only inside the rulebook repo.** Everywhere else it fails silently, costs
   ~0.5 s per input and sometimes 8–16 s (F-007). Where it works, 64 % of its answers say "ask the
   operator" because of a rendering rule, and the model ignores them (F-011, F-040).
3. **The two bash guards spawn on every Bash/Edit/Write of every subagent**, and ordinary prose sends them
   down a slow path (F-001, F-002). They also auto-approve every call (F-039).
4. **`npx @latest` MCP launches and a leaky `update`** add ~1 s and 3 processes per session (F-013) and
   4.5–5.7 k tokens of contradicting v6 rules per session and per spawn (F-030).
5. **On Codex, slowness is Codex's own context and call pattern**; rulebook is ≤ 1 % of each request (F-035).

## Headline numbers

| Metric | Today | 7.5.0 target |
|---|---:|---:|
| Small fix (1–5 edits), delegated vs direct | 65 vs 11 calls, 12.9 vs 4.1 min | judgment mode ≤ 20 calls, ≤ 7 min |
| Prompt hook per input | 0.48–0.93 s, stalls of 8–16 s | 0 by default; ≤ 0.65 s when on |
| Rulebook guard cost per tool call | +93 ms mean over cortex; 2,289 s summed in one session | 0 spawns |
| MCP launch per session | 0.93–1.73 s, 4 processes | pinned; 1 process on the fast path |
| Rulebook tokens per session, upgraded project | 4.5–5.7 k | ≤ 2.1 k |
| Jev "ask the operator" rate | 64 % | ≤ 15 % |

**Validation (09):** on 6 historic small fixes, judgment mode took p50 19 model calls and 3.5 min vs 31 calls and 4.4 min in orchestrator mode, with the same tests passing and 46 % lower cost. The call margin against the ≤ 20 target is thin (n = 6).

## Not rulebook's fault, but on the same path

User-level `cortex-hook` on every tool call (mean 234 + 172 ms, always answers `{}`), UzEngine's own
1.78 s git hook, the Codex plugin stop gate (320 ms per turn), Codex's 133 k-token requests and 8–24 s
calls, 9router's injected style prompt, a broken global `rulebook` junction to `F:\`, machine load from
Rust builds, operator idle and permission prompts (F-005, F-006, F-035, F-038, F-027).
`rulebook doctor --perf` (C8) makes all of these visible.

## Files

| File | Theme | Findings |
|---|---|---|
| [00-orchestrator-measurements.md](00-orchestrator-measurements.md) | Raw baseline numbers | — |
| [01-measured-overhead.md](01-measured-overhead.md) | Hook cost per tool call | F-001..F-006 |
| [02-jev-gate.md](02-jev-gate.md) | The Jev prompt gate | F-007..F-012 |
| [03-mcp-lifecycle.md](03-mcp-lifecycle.md) | MCP launch, processes, startup, exit | F-013..F-019 |
| [04-context-and-orchestration.md](04-context-and-orchestration.md) | Where session time goes; tokens; the delegation mandate | F-020..F-031, F-043 |
| [05-codex-and-9router.md](05-codex-and-9router.md) | The Codex and 9router side | F-032..F-038 |
| [06-model-panel.md](06-model-panel.md) | Codex, gpt-6.1-sol, Claude Opus review; findings they raised | F-039..F-042 |
| [07-recommendations.md](07-recommendations.md) | Changes C1–C9, what is dropped, decisions needed | — |
| [08-execution-plan.md](08-execution-plan.md) | Phased rulebook tasks and CI budgets for 7.5.0 | — |
| [09-replay-ab.md](09-replay-ab.md) | Replay A/B of 6 historic small fixes: judgment vs orchestrator mode (Q5) | — |


## Decisions needed

| # | Question | Recommendation |
|---|---|---|
| Q1 | Orchestration default: judgment or orchestrator | judgment, orchestrator as opt-in |
| Q2 | Prompt gate default | off (fixed, opt-in) |
| Q3 | The guards' implicit auto-approve | explicit `permissions.allow` rules, asked once at `update` |
| Q4 | MCP launch | pinned npx in `.mcp.json`, `node` + path as opt-in fast path |
| Q5 | Replay A/B of ~20 small fixes before release | yes |

## Method

Measured on the operator's machine (Windows 11, Ryzen 9 7950X3D, 130 GB RAM, Kaspersky, CPU at 47–77 %
from other work). Hook timings: a harness that launches hooks exactly as Claude Code does, plus Claude
Code's own recorded `durationMs` over 3 days of transcripts. Session forensics: 30 v7.4 sessions,
53 v7.0–7.3 sessions, 775 subagent transcripts, 1,179 prompt episodes. MCP: stdio benchmark of every
launch style. Codex: its own sqlite state, rollouts and captured request bodies (no model call).
9router: its sqlite usage table. Tokens: tiktoken cl100k (relative, ±10–20 % vs Claude's tokenizer).
Five investigations ran in parallel (Claude Opus 5.5 workers); the panel was Codex (gpt-6-astra),
gpt-6.1-sol and Claude Opus 5.5 — grok-4.6 and kimi-k3 were unreachable through 9router (upstream 502).
Raw scripts and outputs are in the session scratchpad and were not committed.
