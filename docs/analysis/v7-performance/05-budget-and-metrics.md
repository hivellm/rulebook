# 05 — Before/After Budgets and Acceptance Metrics

Every v7 phase ships only when it meets its budget line. Budgets are hard
ceilings, verified by the benchmark harness (see acceptance checks below).

## Budget table

| Metric | v6.0.0 (default) | v7.0.0 target | Δ |
|---|---:|---:|---:|
| Static context/session | ~14,900 tok | ≤2,500 tok | **−83%** |
| MCP schema tokens | ~3,500 (26 tools) | ≤900 (8 tools) | −74% |
| Hook spawns per model turn | 2–4 | 0–1 | ~−100% hot path |
| SessionStart spawns | up to 4 | 0 | −100% |
| Model turns of ceremony per small task | 10–14 | 0–2 | **−85%+** |
| Files installed by default | 91 | ~15 | −84% |
| Rule files | 19 | 1 | −95% |
| Forced subagent round-trips | mandatory | none | wall-clock 2–5× → 1× |
| Orchestration denials (background agents) | on every untagged dispatch | **0 — never** | P0 |
| Permission prompts per session (routine ops) | most mutating ops prompt | **~0** (full-autonomy profile) | F-011 |
| MCP server init | ~370 ms | <150 ms | −60% |

## Impact ledger (live — one row per change)

**Protocol**: every change that alters generated output MUST run
`node scripts/measure-overhead.mjs` (after `npm run build`) and append the
emitted row here **before its task item is checked off**. The row captures the
cost a Fable/Opus session pays for a freshly generated project at that commit.
The v7.0.0 release consolidates this ledger into the final performance report
(phase5). Numbers: static tok = always-loaded tokens/session; MCP =
tools/schema bytes/init; hooks = entries by event (P=PreToolUse,
S=SessionStart, St=Stop, U=UserPromptSubmit); files = installed by default init.

| Date | Commit | Change | Static tok | MCP | Hooks | Files |
|---|---|---|---:|---|---|---:|
| 2026-07-14 | a54669f | **v6.0.0 baseline** (default `init --yes`; full desire set wires +6 hook entries, see F-002) | 14,951 | 26/13,965B/280ms | P:1 S:0 St:0 U:0 | 95 |
| 2026-07-14 | phase1 | **Phase 1 context diet**: lean CLAUDE.md (539 tok) + lean AGENTS.md (666 tok), 16 always-on rules retired, only path-scoped language/library rules remain (863 tok of the total loads only for matching file types) | **6,557 (−56%)** | 26/13,965B/277ms | P:1 S:0 St:0 U:0 | 69 |

## Acceptance checks (CI)

1. **Token budget check**: tiktoken count over generated CLAUDE.md + AGENTS.md +
   rules + agent/skill descriptions + MCP tools/list of a fixture `init` project;
   fail CI if > 2,500.
2. **Hook audit**: assert generated settings.json contains no Stop,
   UserPromptSubmit, SessionStart, or PreToolUse-Agent entries; at most one
   PreToolUse Edit|Write entry.
3. **MCP schema budget**: tools/list ≤ 8 tools and ≤ 3,600 bytes.
4. **Orchestration freedom (P0)**: no generated file (hook, rule, CLAUDE.md,
   AGENTS.md) contains a directive that denies or mandates subagent/team usage —
   enforced by a fixture-based generator test, not by grep.
5. **Startup benchmark**: MCP init+tools/list < 150 ms on CI hardware.
6. **Autonomy profile**: generated settings.json contains
   `permissions.defaultMode: "acceptEdits"` and the full allow set from draft
   6.4; generator test asserts user-authored permissions are never removed or
   tightened.
