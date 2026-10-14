# 08 — Execution plan for 7.5.0

Branch `release/v7.5.0`. Each task is a rulebook task (`.rulebook/tasks/<id>/`). Phase order is the
dependency order; tasks inside a phase are independent and can run in parallel (disjoint files).
Model routing follows `CLAUDE.md`: Fable 5.1 for design and review, Opus 5.5 for edits, tests and docs,
Haiku 4.5 for research.

## Phase 1 — Fixes with no open decision (parallel)

| Task | Scope | Main files | Acceptance metric | Model |
|---|---|---|---|---|
| `phase1_guard-prefilter-fix` | C4 first step: match keywords only in `tool_input.command` / `file_path`; builtin `read`; parity corpus test | `templates/hooks/no-os-scheduling.sh`, `protect-task-scaffolding.sh`, `tests/os-scheduling-guard.test.ts` | fast path on ≥ 95 % of a corpus of real payloads (today: Write 51.8 %); 0 false denials on the corpus; same denials on the existing deny cases | Opus |
| `phase1_prompt-gate-fixes` | C3 except the default: skip machine inputs, strip IDE/system blocks, "ask" only on `needsOperatorDecision`, nothing when ≥ 3 undecided, fewer questions, metadata-only task listing without `migrateArchive`, `systemMessage` once on missing CLI, deadline 1.5 s / timeout 3 s | `src/cli/commands/hook.ts`, `src/core/typesafe/gate.ts`, `prompt-hook.ts`, `src/core/tasks/task-manager.ts` | ask-rate on a replay of the 50 logged prompts ≤ 15 %; notification payloads produce no Jev call; state build at 90 tasks ≤ 20 ms (today 159–175 ms) | Opus |
| `phase1_hook-entry-point` | lightweight `rulebook-hook` bin (`dist/cli/hook-main.js`, imports only the hook module); exec-form hook entries; CLI path resolved at install time | `src/cli/hook-main.ts` (new), `package.json` bin, `templates/hooks/jev-gate.sh`, `src/core/claude/claude-settings-manager.ts` | gate end-to-end ≤ 650 ms (today 929 ms); gate-off startup ≤ 150 ms (today 401 ms) | Opus |
| `phase1_mcp-launch-and-lifecycle` | C5: one writer, pinned version, `update` rewrites `@latest` and legacy `mcp-server` entries, stdin-close exit, PID comment, MCP tool annotations | `src/core/claude/claude-mcp.ts`, `src/cli/commands/mcp.ts`, `src/core/workspace/legacy-migrator.ts`, `src/mcp/rulebook-server.ts`, `src/mcp/tools/v7-tools.ts` | every generated entry has the same pinned form; server exits ≤ 100 ms after stdin close with a live timer; `tests/v7-budgets.test.ts` spawns the generated command | Opus |
| `phase1_update-cleanup` | C6: hash catalogue from git tags, backup instead of delete, all hook events + `settings.local.json`, missing-script entries, agent/skill refresh, language substitution fix | `src/core/migration/v6-cleanup.ts`, `src/core/claude/claude-settings-manager.ts`, `src/core/claude/claude-mcp.ts`, `src/cli/commands/update.ts` | `update` on copies of Synap, ar-v3-dashboard, UzEngine: rulebook-attributable tokens ≤ 2,100 (today 5,676 / ~4,525); 0 hook entries pointing to missing scripts; edited files preserved and reported | Opus (Fable review) |

## Phase 2 — Changes that wait for an operator decision (07, Q1–Q4)

| Task | Scope | Depends on | Acceptance metric | Model |
|---|---|---|---|---|
| `phase2_orchestration-by-judgment` | C1 + C2: new always-on text and spec, `orchestration` config, `update` respects user orchestration text, close-out rules, hand-back format, progress lines | Q1 | replay A/B (Q5) on ~20 historic small fixes: judgment mode p50 ≤ 20 model calls and ≤ 7 min, with the same tests passing as orchestrator mode | Fable (text and spec), Opus (code, tests) |
| `phase2_prompt-gate-default` | C3 default: `gate.promptHook.enabled` false, drop "Gate first" and the manual-fallback rule | Q2, `phase1_prompt-gate-fixes`, `phase1_hook-entry-point` | 0 ms per prompt with the gate off; opt-in path meets the phase-1 metrics | Opus |
| `phase2_guards-to-permissions` | C4 rest: OS scheduling as `permissions.deny` (Bash, PowerShell, `Edit(...)`), scaffolding guard behind `if`, explicit allow rules with consent | Q3, `phase1_guard-prefilter-fix` | 0 rulebook process spawns on an ordinary Bash/Edit/Write call; deny parity with the script on the corpus; no new permission prompts unless the operator chose it | Fable (design), Opus |
| `phase2_mcp-fast-path` | opt-in `node` + absolute path entry in local/user scope; bundled server | Q4, `phase1_mcp-launch-and-lifecycle` | 1 process and ≤ 300 ms init per session on the fast path (today 4 and 931–1,734 ms) | Opus |

## Phase 3 — Visibility and guard rails (parallel, after phase 1)

| Task | Scope | Acceptance metric | Model |
|---|---|---|---|
| `phase3_doctor-perf` | C8 report | lists every hook with owner and p50/p90; flags the broken global junction, `@latest` entries, stale PID files, leftover v5/v6 assets, override shadowing, always-`{}` blocking hooks | Opus |
| `phase3_budget-tests-and-ledger` | C7: injected-context budget, Codex budget, P0 restored, hook-latency corpus test, ledger rows v7.1–7.5 | CI fails on: fast path < 95 %, generated MCP command > 1 process (fast path) or unpinned, always-on > budget, any generated text mandating or forbidding delegation | Opus |
| `phase3_codex-awareness` | C9 | Codex request body (via `codex debug prompt-input`) contains the lean rulebook rules in a v7.5 project | Opus |

## Phase 4 — Release

| Task | Scope | Acceptance metric | Model |
|---|---|---|---|
| `phase4_v750-release` | re-run the measurements of 00–05 on the same projects, update the ledger, CHANGELOG, version bump, full quality gate | every phase metric met or explicitly waived in the CHANGELOG | Fable (review), Opus |

## Budgets proposed for CI

| Budget | Today | 7.5.0 target |
|---|---:|---:|
| Prompt hook wall time, gate on | 929 ms | ≤ 650 ms |
| Prompt hook wall time, default install | 0.48–0.93 s | 0 ms (off) |
| Rulebook process spawns per ordinary tool call | 1–2 | 0 |
| Guard fast-path share on the payload corpus | Write 51.8 % | ≥ 95 % |
| Processes per session for the rulebook MCP server | 4 | 4 pinned npx (1 on the fast path) |
| Rulebook always-on tokens, upgraded project | 4.5–5.7 k | ≤ 2.1 k |
| Jev "ask the operator" rate on the logged prompts | 64 % | ≤ 15 % |
