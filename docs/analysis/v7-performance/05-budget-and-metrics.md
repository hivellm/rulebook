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
| 2026-08-17 | v7.0.2 | **Worktree/`.git` destruction guard + Communication directive**: worktree placement (outside the repo tree) and teardown (`worktree remove` + `prune`, never `rm -rf`) added to CLAUDE.md/AGENTS.md/git spec/prohibitions; `.git` destruction forbidden outright; plain-language + answer-first communication rule. `tests/directive-guards.test.ts` pins both clause sets into generated output. +92 tok CLAUDE.md, +73 tok AGENTS.md → **file budget 1,460 of 1,600 ✔** | **1,770** | 5/3,562B/226ms | P:1 S:0 St:0 U:0 | 17 |
| 2026-07-14 | a54669f | **v6.0.0 baseline** (default `init --yes`; full desire set wires +6 hook entries, see F-002) | 14,951 | 26/13,965B/280ms | P:1 S:0 St:0 U:0 | 95 |
| 2026-07-14 | phase1 | **Phase 1 context diet**: lean CLAUDE.md (539 tok) + lean AGENTS.md (666 tok), 16 always-on rules retired, only path-scoped language/library rules remain (863 tok of the total loads only for matching file types) | **6,557 (−56%)** | 26/13,965B/277ms | P:1 S:0 St:0 U:0 | 69 |
| 2026-07-14 | phase6 | **Post-v7 optimization (ALL BUDGETS PASS)**: 12 slash commands retired (MCP tools cover every verb; update strips old copies), language specs → pointers to canonical path-scoped rules, honest always-on/on-demand benchmark split (AGENTS.md verified as NOT auto-loaded by Claude Code → other-tools bucket), Win init budget 250 ms. **1,678 always-on (+3,383 on-demand) · 17 files** | **1,678** | 5/3,562B/208ms | P:1 S:0 St:0 U:0 | **17** |
| 2026-07-14 | release-prep | **External audit fixes (#18–#24) + release prep**: dependency-order semantics, git rules by blast radius, tail waiver, bounded session payload (+history rotation), workspace path-routing, neutral MCP reference, tiered gate. README/CHANGELOG finalized; schemas re-trimmed to fit new params (path/tailWaiver) — **3,562 B ≤ 3,600 ✔** | 3,460 | 5/3,562B/~205ms | P:1 S:0 St:0 U:0 | 29 |
| 2026-07-14 | 8c53e75 | **Session hygiene**: contextTip on archive/session-end responses, statusline context meter (`ctx NN%`), durable compact-at-60% line in CLAUDE.md; merger sentinel regex un-hardcoded (v7-stamped files updated again). +45 tok for the guidance line | 3,397 | 5/3,592B/~230ms | P:1 S:0 St:0 U:0 | 29 |
| 2026-07-14 | v7.0.0 | **Version bump + self-update**: package/server/sentinels at 7.0.0 (version-tolerant sentinels recognize v5/v6-stamped files for migration); `rulebook update --yes` self-applied v7 to this repo (CLAUDE.md regenerated, 12 local commands slimmed, specs refreshed, rules re-stamped); update advisory got a real semver comparison (no more downgrade suggestions) | 3,352 | 5/3,592B/~300ms | P:1 S:0 St:0 U:0 | 29 |
| 2026-07-14 | phase3 | **MCP consolidation**: 26 per-verb tools → **5** action-parameterized (6 in workspace mode); schemas 13,965 → **3,592 B (−74%, budget ✔)**; session-start returns plans+tasks+learnings in ONE call; `.mcp.json` → standalone slim server (no CLI deps), init 232 ms Win / <150 ms Linux. **Static context: 3,358 tok (−78% vs baseline)** | **3,358** | **5/3,592B/232ms** | P:1 S:0 St:0 U:0 | 29 |
| 2026-07-14 | phase4 | **Asset prune**: agents/workflows opt-in (0 installed by default), dev skills reduced to rulebook-specific (analysis/spec/karpathy), hidden side-effect installer in generateModularAgents removed along with the delegation-table section, terse/handoff code+types deleted, P0 orchestration-freedom test added. **Default install 95 → 29 files; static 5,955 tok** (3,491 of it = MCP schemas → phase3) | **5,955** | 26/13,965B/~310ms | P:1 S:0 St:0 U:0 | **29** |
| 2026-07-14 | phase2 | **Hook teardown + full autonomy (P0)**: settings-manager rewritten — max ONE hook (path-only scaffolding guard, no content regexes), zero Stop/UserPromptSubmit/SessionStart entries, PreToolUse-Agent denial gone forever, 12 legacy signatures auto-stripped on update, full-autonomy permissions (acceptEdits + broad allow, never tightens user rules), marker checks moved to staged-diff pre-commit gates, update check moved into the CLI. Full v6 desire set was 7 hook entries in 5 events → **1** | 6,786 | 26/13,965B/~420ms | P:1 S:0 St:0 U:0 | 61 |
| 2026-07-14 | phase1b | **Template unification** (parallel agent fleet ×7): 19 language templates lean (208→37 KB), 11 agents + 12 commands slimmed (~52 KB→~22 KB), hook docs 64→10.5 KB, libraries + module-skills + retired-subsystem skills eliminated, 17 retired rule templates removed, ALL filenames lowercase kebab-case, this repo's .claude/.rulebook cleaned. templates/ total **1,219 KB → 564 KB (−54%)** | 6,786 | 26/13,965B/~420ms | P:1 S:0 St:0 U:0 | 60 |
| 2026-07-14 | phase1a | **Spec diet**: on-demand `.rulebook/specs/` **29,942 → 3,787 tok (−87%)** — RULEBOOK.md 51 KB→~600 tok, GIT.md 7,546→~450 tok, TOKEN_OPT/AGENT_AUTOMATION/MULTI_AGENT + all 9 MCP-module specs retired, language specs unified with lean rule templates (16–18 KB→~500 tok for the 8 core languages), 8 dead templates deleted. Dogfooded on this repo (17 always-on rules deleted, CLAUDE.md/AGENTS.md regenerated lean) | 6,515 | 26/13,965B/~290ms | P:1 S:0 St:0 U:0 | 66 |

### v7.1 → v7.5 (7.5 measurement method)

The rows above estimate MCP schemas into "static tok" and count files as
written. From 7.5 the benchmark counts what Claude Code actually injects
(docs/analysis/multi-session-performance/04, F-029), so these rows are
comparable with each other, not with the rows above:

- **Always-on** (Claude Code, tiktoken cl100k): CLAUDE.md with HTML comments
  stripped and `@imports` expanded (AGENTS.override.md comes in through the
  import), CLAUDE.local.md, every `.claude/rules/*.md` without `paths:`, the
  listing lines for installed skills/commands/agents, and the deferred MCP
  tool names. MCP schemas load on first use and are not counted here.
- **Codex**: AGENTS.override.md when present (Codex reads it instead of
  AGENTS.md), else AGENTS.md.
- **Hot-path hooks**: rulebook hook handlers that spawn on an ordinary tool
  call or prompt — PreToolUse without an `if` rule, PostToolUse,
  UserPromptSubmit, Stop, SubagentStop.
- **Fixture**: a TypeScript project after `init --yes` then `update --yes`,
  with Claude Code detected and the TypeSafe plugin present (temp HOME); MCP
  init is the median of three cold starts of `node dist/mcp/rulebook-server.js`;
  files exclude `.rulebook/backup/` and the `.rulebook/.update-check` cache.

v7.1.0–v7.4.0 were measured from the published npm packages
(`node scripts/measure-overhead.mjs --rulebook <package root>`); v7.5.0 from
the `release/v7.5.0` build (package.json still reads 7.4.0 before the version
bump). Measured 2026-10-14 on Windows 11. The Files column was re-measured
for every row once the count left out `.rulebook/.update-check` (one fewer
file each).

| Version | Change | Always-on tok | Codex tok | MCP tools/schema/init | Hot-path hooks | Files |
|---|---|---:|---:|---|---|---:|
| v7.1.0 | GitHub-issues task backend (opt-in). MCP entry `npx … @latest` | 957 | 42 | 5/3,562B/176ms | 1 (PreToolUse task guard) | 18 |
| v7.2.0 | Decision requests on `rulebook_task` (ask/answer/questions): +727 B schema; CLAUDE.md +66 | 1,023 | 42 | 5/4,289B/181ms | 1 | 18 |
| v7.3.0 | No-OS-scheduling guard (second PreToolUse hook, no `if`); TypeSafe opt-in | 1,021 | 42 | 5/4,289B/188ms | 2 | 19 |
| v7.4.0 | `rulebook_gate` (+820 B schema), TypeSafe on by default (typesafe.md +92 always-on), Jev prompt hook on every prompt | 1,160 | 42 | 6/5,109B/239ms | 3 (2 PreToolUse + UserPromptSubmit) | 22 |
| v7.5.0 | Prompt hook opt-in; guards as `permissions.deny` / `if`-gated; pinned MCP entry; RULEBOOK-CODEX block in AGENTS.override.md (+309 Codex, and ~290 in Claude Code through `@AGENTS.override.md`); task content on create + tool annotations (+1,016 B schema); `jev-gate.sh` and `no-os-scheduling.sh` installed only with the opt-in tool gate | **1,449** | 351 | 6/6,125B/233ms | **0** (2 PreToolUse handlers, both `if`-gated) | **20** |

Against the budgets: always-on 1,449 ≤ 1,600 and Codex 351 ≤ 390
(`tests/context-budget.test.ts`), schema 6,125 ≤ 6,260 B and 6 ≤ 8 tools
(`tests/v7-budgets.test.ts`), 0 hot-path spawns (`tests/hook-spawn-budget.test.ts`).
Installed files are 20, at the target (21 before `no-os-scheduling.sh` was
limited to projects with the opt-in tool gate, the only hook that runs it). With
the 11 opt-in agents installed (projects upgraded from
v5/v6 keep them) the always-on total is 1,911, under the 2,100 target for an
upgraded project.

## Acceptance checks (CI)

1. **Token budget check** (`tests/context-budget.test.ts`, v7.5 method above):
   Claude Code always-on ≤ 1,600 tokens (≤ 2,100 with the opt-in agents),
   the prompt hook's per-prompt context ≤ 260 at its 1,024-byte cap, Codex
   ≤ 390 (AGENTS.override.md) and ≤ 870 (AGENTS.md without an override).
2. **Hook audit** (`tests/hook-spawn-budget.test.ts`, on a project the built
   CLI generates): every rulebook PreToolUse handler carries an `if` rule, no
   other rulebook hook event, and no UserPromptSubmit entry unless
   `gate.promptHook.enabled` is true — 0 rulebook spawns per ordinary call.
3. **MCP schema budget** (`tests/v7-budgets.test.ts`, spawning the generated
   launch command): tools/list ≤ 8 tools and ≤ 6,260 bytes.
4. **Orchestration freedom (P0)**: no generated file (hook, rule, CLAUDE.md,
   AGENTS.md) contains a directive that denies or mandates subagent/team usage —
   enforced by a fixture-based generator test, not by grep.
5. **Startup benchmark**: MCP init+tools/list < 150 ms on CI hardware.
6. **Autonomy profile**: generated settings.json contains
   `permissions.defaultMode: "acceptEdits"` and the full allow set from draft
   6.4; generator test asserts user-authored permissions are never removed or
   tightened.
