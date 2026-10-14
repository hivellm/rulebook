# 05 — The Codex and 9router side

Measured 2026-10-14 on codex-cli 0.162 and the VS Code ChatGPT extension app-server, with Codex's own
state (`~/.codex/state_5.sqlite`, `logs_2.sqlite`, rollouts), a local capture server for exact request
bodies (no model call), and 9router v0.5.99 (`%APPDATA%/9router/db/data.sqlite`, read-only).

**Short answer:** Codex turns are slow because of how Codex works: dozens to hundreds of sequential model
calls per turn, each re-sending ~133 k tokens, each taking 8–24 s. Rulebook adds at most ~1.3 k tokens
per request (≤ 1 %) and no per-call hook time on the Codex side today.

## F-032 — Rulebook does not write `.codex/`; Codex copies it from `.claude/` and `.mcp.json`

- **Evidence:** no `src/` code writes `.codex/config.toml` or `.codex/hooks.json`. Codex's "external
  agent import" does: `state_5.sqlite` table `external_agent_config_imports` has 18 runs, the first on
  10-04 16:11, repeating about every 12 h. The copied hook scripts are byte-identical to `.claude/hooks/`.
- **Impact:** whatever rulebook writes to `.mcp.json` and `.claude/` ends up in Codex, including the
  `npx @latest` launch (03 F-013).
- **Confidence:** high. **Rulebook-attributable:** partly.

## F-033 — Codex never runs rulebook's project hooks: no cost, but no protection either

- **Evidence:** `~/.codex/config.toml` stores trust for 9 hooks only (3 from the Codex plugin, 6 cortex);
  no project `.codex/hooks.json` is trusted. Every `codex exec` run in Rulebook, Synap and UzEngine printed
  only cortex and plugin hooks. `gate.jsonl` did not grow after Codex runs. `logs_2.sqlite` has 0 matches
  for `jev-gate` and `no-os-scheduling`. The hooks also match Claude tool names (`Bash|Edit|Write`) while
  Codex calls `exec`, `exec_command`, `apply_patch`, and `codex.exe` never sets `CLAUDE_PROJECT_DIR`.
- **Confidence:** high. **Rulebook-attributable:** yes (the guards silently do not apply in Codex).

## F-034 — `AGENTS.override.md` shadows `AGENTS.md` for Codex, so Codex never sees rulebook's rules

- **Evidence:** captured request bodies: Codex injects only `AGENTS.override.md` when both exist in the
  same folder. All 7 v7.4 projects have an override. Codex also truncates project docs at 32 KB
  (`project_doc_max_bytes`).
- **Numbers:** rulebook repo: 125 tokens of override, 0 of AGENTS.md (796). Assets3D's own override is
  12,860 tokens and is cut to 7,172 tokens on every request (user-owned, not rulebook).
- **Confidence:** high. **Rulebook-attributable:** yes (rulebook generates both files and relies on the override pattern).

## F-035 — Codex's per-request context, not rulebook, drives Codex turn latency

- **Numbers (5 live Assets3D rollouts, 2,678 requests):** input p50 136 k tokens, mean 133 k, 95.8 %
  cached; the first request of a thread is ~28 k (fixed prefix), the rest is conversation growth. One main
  thread made 1,775 requests in 16 turns (p50 91, max 365 per turn). Time to first output after a tool
  result:

  | Context | p50 | p90 |
  |---|---:|---:|
  | 0–50 k | 7.9 s | 13.5 s |
  | 50–100 k | 10.2 s | — |
  | 100–150 k | 14.6 s | — |
  | 150–200 k | 21.0 s | — |
  | 200–250 k | 24.3 s | 59.5 s |

  Tool execution between calls p50 3.0 s. 9router `usageHistory`, 10-11 → 10-14: Codex 9,031 requests,
  1.02 × 10⁹ prompt tokens (avg 113 k, p90 190 k), 95.5 % cached, $1,449; gpt-6-astra 7,068 requests.
  By project: Assets3D 74.2 %, UzPainter 22.9 %, Synap 3.0 %. Rulebook's share per request: ~0.2–1.3 k
  tokens (imported skills and agent roles).
- **Confidence:** high. **Rulebook-attributable:** no.

## F-036 — `codex exec` fixed cost: ~9 s and ~19 k tokens, of which rulebook is ~170 tokens

- **Numbers:** trivial prompt in this repo: 9.3 s wall (process start 1.6 s, context build 2.2 s, prompt
  submit 1.0 s, first token 5.2 s after turn start, exit 2.1 s), 19,390 input tokens. Request breakdown
  (cl100k): tool schemas 7,679 (code-mode `exec` 4,091), Codex base instructions 4,187, skills list +
  permissions + modes 4,254, multi-agent prompts 631, AGENTS + environment 244. Rulebook's share: the
  4 imported skills, ~170 tokens. Fixed prefix in other projects: Synap 20.2 k (11 rulebook agent roles,
  663 tokens), UzEngine 27.5 k (39 roles, mostly UzEngine's own). Rulebook MCP schemas cost 0 upfront
  (Codex defers MCP tools). Direct OpenAI vs 9router: 9router was not the slow part (n=3, noisy).
- **Confidence:** high. **Rulebook-attributable:** partly (≤ 1 %).

## F-037 — Rulebook's MCP tools carry no annotations, so Codex's reviewer screens every call

- **Evidence:** no `readOnlyHint` / `destructiveHint` / `openWorldHint` anywhere in `src/mcp/`.
  Codex `thread_history`: 17 rulebook MCP calls.
- **Numbers:** calls on 10-10 took 1–4 ms; on 10-13 each took 2.1–2.8 s, created in the same second as a
  guardian (codex-auto-review) thread. One `rulebook_gate` call was rejected by the guardian ("sends
  internal project context out"); one `rulebook_task` call failed with "requires approval, but approval
  policy is never".
- **Confidence:** medium. **Rulebook-attributable:** yes.

## F-038 — 9router injects a 413–421-token style prompt into every request (not rulebook)

- **Evidence:** 9router setting `cavemanEnabled: true`; the prompt lives in code (caveman level "full",
  1,834 chars). Header `x-9router-token-saver: off` disables it. Codex traffic: 18,524 prompt tokens by
  default vs 18,111 with the header.
- **Numbers:** ~413 tokens per request, ~3.7 M across 9,031 Codex requests (mostly cached); it also changes
  answer style (grok and kimi replied "caveman"). 9router has no latency logging (`requestDetails` 0 rows).
  Codex fails to decode 9router's `/v1/models` every 4.5 min (harmless log spam).
- **Confidence:** high. **Rulebook-attributable:** no.

## Not rulebook's on the Codex side

Codex base prompt (4.2 k) and code-mode tool (4.1 k); skill lists synced from Claude (~2 k); context growth
to ~133 k per request; reasoning effort ultra/xhigh; guardian reviews (540 requests, p50 2.8 s per turn);
cortex hooks (~370 ms per pair); Playwright npx chains under the same app-server (785 MB); per-thread MCP
retention in the app-server; 9router's style prompt; Assets3D's 12.9 k-token override.

**Credential note:** `ar-v3-dashboard/.codex/config.toml` and `ar-v3-dashboard/.mcp.json` hold an
Omie app key and secret in plain text (user config, not rulebook). They were not copied here.
