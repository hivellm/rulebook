## 1. Implementation
- [x] 1.1 Operator decision Q1 recorded (default mode) — Q1 = `judgment` default, `orchestrator` as explicit opt-in; decided by the operator (2026-10-14)
- [x] 1.2 Config switch + generator support for both modes — `orchestration` in rulebook.json (types, config defaults + migration → judgment); CLAUDE.md, lean AGENTS.md and specs/orchestration.md render the mode via `<!-- orchestration:MODE -->` template markers
- [x] 1.3 New always-on text and spec (written and wired by Opus 5.5 in one lane) — judgment text with visible criteria; orchestrator text = v7.4 minus the F-023 contradictions; "Gate first" and the manual rulebook_gate fallback removed from all always-on text
- [x] 1.4 update preserves user orchestration text — an edited `## Orchestration` section of the CLAUDE.md block (not matching any shipped variant) is kept and reported; AGENTS.override.md content is never touched
- [x] 1.5 Replay A/B (Q5), 6 historic fixes × 2 modes: judgment p50 19 calls (≤ 20) and 3.5 min (≤ 7), 6/6 tests passing in both modes, 46 % cheaper; thin margin on calls, n=6 — see docs/analysis/multi-session-performance/09-replay-ab.md

## Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (CHANGELOG entry + affected guides/specs) — README (orchestration, configuration), docs/MCP_SERVER.md (gate on demand), spec template; CHANGELOG bullets handed to the main session
- [x] 2.2 Write tests covering the new behavior — tests/orchestration-mode.test.ts, context-budget (P0 restored, both modes ≤ 1600), directive-guards, gate
- [x] 2.3 Run tests and confirm they pass (type-check → lint → tests)
