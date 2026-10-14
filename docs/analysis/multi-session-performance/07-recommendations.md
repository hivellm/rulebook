# 07 — Recommendations for the next version

Each change lists the findings it answers and the expected gain, measured the same way as in 01–05.
Gains do not add up: fewer spawns also means fewer hook runs, gate calls and cold starts.

## Version target: 7.5.0

The 2026-09-26 plan (`docs/analysis/rulebook-simplification/08-execution-plan.md`) scheduled 7.4.1 (update
bugs), 7.5.0 (removals) and 7.6.0 (shared init/update pipeline). This analysis re-sequences it:

- **7.5.0 = performance.** Everything below. No public API is removed, so a minor version fits semver. The
  generated text and defaults change behaviour, which the CHANGELOG states plainly.
- The 7.4.1 update-bug fixes overlap with the cleanup work here (C4) and ship inside 7.5.0.
- The 7.5.0 removals (dead dependencies, unread config) move to 7.6.0 with the shared pipeline, except the
  dependency removals that shrink the npx install (blessed, chokidar, uuid…), which ride along with C5.

## Keep / change / drop

| # | Change | Verdict | Answers | Expected gain |
|---|---|---|---|---|
| C1 | **Orchestration by judgment.** Default `orchestration: "judgment"`; `"orchestrator"` stays as an explicit mode. Always-on text gives reasons and visible criteria instead of "never/always": do it directly when the files are already in context and about 3 or fewer will change; delegate for ≥ 2 independent parts with disjoint files, broad exploration, long work, or a main context past ~150 k. Delegation is for context protection and parallelism, not speed. `update` respects the setting and never overwrites a user's orchestration text. | **keep (consensus)** | F-020..F-025, F-031 | small requests from p50 56–65 calls / 12.9 min toward 11–16 calls / 4–7 min; to be confirmed by the replay benchmark, not promised |
| C2 | **Conditional close-out.** CHANGELOG per PR or release for user-visible changes; task archive only for tracked multi-session tasks; full diff review once per PR (`review-fanout`); subagents run the tests covering their change, the full gate runs before a commit batch and before push. Hand-backs: outcome, files changed, checks run, open risks. One progress line after each dispatch and each hand-back. | **change** (drop `--stat` review, drop push-only validation) | F-021, F-023, F-028 | fewer sequential turns per task; shorter perceived silence |
| C3 | **Prompt gate fixed, then off by default.** Skip machine inputs (`<task-notification>`, agent messages); strip IDE/system blocks before classifying; "ask the operator" only when `needsOperatorDecision === true`; inject nothing when ≥ 3 fields are undecided; drop skill/agent/model/parallel questions; lightweight `rulebook-hook` entry in exec form (no bash); task listing reads metadata only and never runs `migrateArchive`; resolve the CLI path at install time; on a missing CLI, one `systemMessage` per session; deadline 1.5 s, timeout 3 s; `gate.promptHook.enabled` defaults to false; "Gate first" leaves the always-on text. `rulebook_gate` stays as an on-demand tool, with no manual-fallback rule. | **keep (consensus)** | F-007..F-012, F-040 | off: −0.5 to −1.0 s per input and no 8–16 s stalls; on: 929 → ≤ 650 ms, ~75–94 % of runs skipped |
| C4 | **Guards stop spawning on ordinary calls.** Now: prefilter matches only `tool_input.command` / `file_path`, builtin `read` instead of `$(cat)`. Then: OS scheduling as `permissions.deny` (Bash + PowerShell + `Edit(...)` paths, never `Write(...)`); scaffolding guard behind the hook `if` field so it spawns only for `.rulebook/tasks/**`; parity tests over a corpus of real payloads. The implicit auto-approve becomes an explicit decision (Q3). | **change** (parity tests and Q3 first) | F-001..F-004, F-039 | prefilter fix: −170 to −220 ms on slow-path calls; full rework: 0 rulebook spawns per ordinary call, ~83 ms/call and ~2,300 s per heavy session (summed) |
| C5 | **MCP launch.** One writer for all entries; generated entry pinned to the installed version; `update` rewrites old `@latest` and legacy `mcp-server` entries; opt-in `node` + absolute path in local/user scope as the fast path; explicit stdin-close exit; remove the wrong PID-file comment; MCP tool annotations (`readOnlyHint` etc.) so Codex's reviewer can skip read-only calls; later a bundled server (−100 ms). No shared daemon, no idle shutdown. | **keep (consensus)** | F-013..F-019, F-037 | pinned: same version everywhere, no cold install per release; direct node: −0.85–1.1 s, 3 processes, ~80 MB private per session; Codex: −2.1–2.8 s per reviewed MCP call |
| C6 | **`update` really cleans up.** Content-hash catalogue of every rule, agent, skill and hook shipped since v5 (built from git tags); move matches to `.rulebook/backup/`; keep edited files and report them; manage all hook events and `settings.local.json`; strip entries whose script is missing; refresh agents (fix the language substitution) and skills. | **keep (consensus)** | F-030, F-041, F-042, F-006 | −2.6 to −3.8 k tokens per session and per spawn in upgraded projects; contradicting v6 rules gone; UzEngine's 269 errors per session gone |
| C7 | **Budgets that measure reality.** Count what Claude Code injects (CLAUDE.md without comments, every always-on rule, listing lines, deferred names, per-prompt hook context); separate Codex budget for AGENTS/override; restore P0 as "no generated text mandates or forbids delegation"; hook-latency test over a real-payload corpus (fast path ≥ 95 %); MCP test that spawns the *generated* launch command; resume the ledger at v7.4. | **keep** | F-019, F-029 | regressions caught in CI |
| C8 | **`rulebook doctor --perf`.** Read-only report: every hook from user, project, local, plugin and Codex config with owner, matcher, blocking/async and measured p50/p90; CLI resolution (flags a broken global junction); MCP launch form and live chains per host; stale PID files; leftover v5/v6 assets; AGENTS.override shadowing for Codex; hooks that always print `{}` (suggest `async: true`); timeouts in transcripts. | **keep** | F-005, F-006, F-034, F-038 | no direct speedup; makes the not-rulebook costs visible |
| C9 | **Codex awareness.** Put a lean rules block where Codex reads it (the override shadows AGENTS.md); state that project hooks need Codex trust and Codex tool names; derive the project dir without `CLAUDE_PROJECT_DIR`. | **keep (small)** | F-032..F-034 | Codex sees rulebook's rules at all |

## Dropped or deferred

- **Shared per-machine MCP daemon:** high complexity, saves 10–40 MB per session at best (F-013 table).
- **Idle shutdown inside the MCP server:** clients do not restart stdio servers.
- **Agent concurrency limits:** no measurement supports a number; measured in the replay benchmark first.
- **MCP schema byte-shaving:** low value (< 1 % of processed tokens).
- **Warm-agent reuse as a rule:** only suggested for follow-ups on the same files.

## Not rulebook's fault, but rulebook should detect it (via C8)

| Cause | Measured | What the operator can do |
|---|---|---|
| `cortex-hook` on every tool call, blocking, always `{}` | mean 234 + 172 ms per call; ~6–12 s per 30-call turn | make PreToolUse/PostToolUse `async: true` or narrow the matcher |
| UzEngine's own `block-destructive-git.sh` | 1,780 ms per Bash call | replace with git-safety `permissions.ask` rules (rulebook can ship these) |
| Codex plugin stop gate | 320 ms per Stop | report only |
| Broken global `rulebook` junction to `F:\Node\hivellm\rulebook` | 0.5 s per prompt, 8–16 s stalls | remove or rebuild the global link (local machine state) |
| Codex per-request context and call count | 133 k tokens per request, p50 91 calls per turn, 8–24 s per call | reasoning effort, thread length; not rulebook |
| 9router style prompt | 413–421 tokens per request, changes answer style | `x-9router-token-saver: off` or disable caveman mode |
| Codex app-server keeps an MCP set per thread | 8 rulebook chains under one app-server | close idle Codex threads; C5 shrinks each set |
| Machine load | CPU 77 % from Rust builds, Kaspersky resident, bash start 80–130 ms | fewer spawns (C3, C4) is rulebook's part |
| Operator idle and permission prompts | e.g. 109.7 h in 10 prompts (Vectorizer) | explicit permission defaults (Q3) |

## Decisions needed

| # | Question | Options | Recommendation |
|---|---|---|---|
| Q1 | Orchestration default | judgment / orchestrator | **judgment**, orchestrator as explicit opt-in |
| Q2 | Prompt gate default | off (fixed, opt-in) / on (fixed) | **off** |
| Q3 | The guards' implicit auto-approve (F-039) | keep it by writing explicit `permissions.allow` rules with consent at `update` / drop it and accept prompts / keep emitting `allow` from a hook | **explicit allow rules, asked once at update** |
| Q4 | MCP launch in checked-in `.mcp.json` | pinned npx / `node` + path in local scope as opt-in fast path / both | **both**: pinned in `.mcp.json`, fast path opt-in |
| Q5 | Validate C1 with a replay A/B of ~20 historic small fixes before release | yes / no | **yes** |
