# 00 — Orchestrator measurements (raw, 2026-10-14)

Raw numbers measured by the main session before the five investigations started.
Files 01–08 cite and extend these.
Machine: Windows 11 Pro, Ryzen 9 7950X3D, 130 GB RAM, Kaspersky resident, CPU at 77 % from
Rust builds of other projects during measurement. Node v24.16.0, Claude Code 2.1.296, codex-cli 0.162.0.

## Per prompt (UserPromptSubmit) — every v7.4 project, Claude and Codex

| Step | Measured | Source |
|---|---:|---|
| `jev-gate.sh prompt` end-to-end (bash → `node dist/index.js hook prompt-gate` → Jev) | 924–982 ms (3 runs) | `.claude/hooks/jev-gate.sh`, `.claude/settings.json` |
| of which: bash spawn | 80–102 ms | `bash -c true` ×3 |
| of which: full CLI module graph load (`dist/index.js`) | 287–502 ms | `RULEBOOK_GATE=off node dist/index.js hook prompt-gate` ×3 |
| of which: Jev HTTP (TypeSafe) | p50 402 / p90 471 / max 596 ms | `.rulebook/logs/gate.jsonl`, n=41 |
| import of `dist/cli/commands/hook.js` alone | 32–36 ms | `node --input-type=module -e "await import(...)"` |
| user-level `cortex-hook UserPromptSubmit` (blocking, not rulebook) | 109–136 ms | `~/.claude/settings.json` |

Jev outcomes, all logs found (Rulebook 41 + UzPainter 9 = 50 calls): kind undecided 22, unclear 8,
small-fix 7, question 8, task-work 4, setup 1. Undecided fields: skill 33, needs_operator_decision 25,
needs_task 22, kind 22, agent 22, parallel 19, model 11. **32 of 50 prompts (64 %) came back as
"ask the operator before acting".** Average 2,151 Jev input tokens per call, 2,275 bytes of state.

## Per tool call (PreToolUse Bash|Edit|Write)

| Hook | Measured (3 runs) | Installed by |
|---|---:|---|
| `no-os-scheduling.sh` | 129–150 ms | rulebook v7.3+ |
| `protect-task-scaffolding.sh` (Edit\|Write) | 133–156 ms | rulebook v7 |
| `cortex-hook PreToolUse` (matcher `*`, blocking) | 115–220 ms | user-level settings (not rulebook) |
| `cortex-hook PostToolUse --fire-forget` | 129–141 ms | user-level settings (not rulebook) |
| UzEngine `block-destructive-git.sh` (PreToolUse Bash) | 1,780 ms | project's own hook (not rulebook) |

Hooks on one event run in parallel, so wall time per call ≈ the slowest hook; CPU time is the sum.
Synap session (11.6 MB transcript): 678 tool uses, 927 PreToolUse hook events, 674 PostToolUse.

## MCP server per session

| Measurement | Value |
|---|---:|
| `initialize` round-trip incl. node start, local `dist` | 286–467 ms |
| same, npx-cached 7.4.0 | 244–271 ms |
| `tools/list` (6 tools, 5,109 schema bytes) | 3–5 ms |
| `rulebook_session context` / `rulebook_task list` / `rulebook_memory list` | 2 / 2 / 14–19 ms |
| `npx -y --package=@hivehub/rulebook@latest rulebook --version` (what every other project runs at session start) | 1,685–3,130 ms |
| same, pinned `@7.4.0` | 1,557 ms |

Every project except this repo launches the server with `npx … @latest` in both `.mcp.json` and
`.codex/config.toml`. The launch leaves a 4-process chain alive for the whole session:
`claude.exe/codex.exe → cmd.exe (7 MB) → node.exe npx (47 MB) → cmd.exe (7 MB) → node.exe rulebook-mcp (45 MB)`.
At measurement: **13 rulebook MCP chains alive** (5 under Claude sessions, 7 under the single Codex
app-server started 10-12; oldest chain 10-13 00:37) ≈ 52 processes, ≈ 1.3 GB.

## Machine and sessions

1,014 processes, 66 `node.exe`, 53 `bash.exe`, 5 `claude.exe`, 12 Codex-related processes, 9router
gateway 270 MB. 22 projects on rulebook (5.7.0 ×1, 6.0.0 ×4, 7.0.0 ×8, 7.0.1 ×3, 7.4.0 ×7); only 7.4
installs the Jev prompt hook and the second guard. Claude Code talks to Anthropic directly
(no `ANTHROPIC_BASE_URL`); Codex goes through 9router (`model_provider = "9router"`).

## Codex / 9router side

9router `usageHistory`, 2026-10-11 → 10-14, 9,668 requests, all `ok`:

| Provider | Requests | Prompt tokens | Avg prompt tokens / request |
|---|---:|---:|---:|
| codex (gpt-6-astra 6,996; gpt-6.1-sol 1,373; codex-auto-review 531) | 8,916 | 1.007 × 10⁹ | ≈ 113 k |
| claude (opus-5 260, fable-5 86) | 351 | 62.8 × 10⁶ | ≈ 179 k |
| xai | 190 | 11.9 × 10⁶ | ≈ 63 k |
| kimi | 211 | 2.2 × 10⁶ | ≈ 10 k |

One-word prompts through 9router: `cx/gpt-6-astra` (responses API) 16.5 s with 2,492 input tokens
(9router injects a system prompt); `xai/grok-4-fast` 9.3 s answering in the injected "caveman" style;
`cx/gpt-6.1-sol` 3.3 s. `codex exec "READY"` read-only in this repo: 12.1 s, 19.4 k tokens.
Codex does execute hooks (`hook: Stop Completed` printed by `codex exec`).

## Prior work this analysis continues

- `docs/analysis/v7-performance/` (2026-07-14): v6→v7 removed 6 of 7 hooks including the
  UserPromptSubmit one (F-002), MCP 26→5 tools, static context 15 k→1.7 k tokens; forced delegation
  measured at 2–5× wall-clock.
- `docs/analysis/rulebook-simplification/` (2026-09-26): plans 7.4.1 / 7.5.0 / 7.6.0.
- v7.4.0 (2026-09-26) then added: the Jev prompt hook on every prompt (reversing F-002 on purpose),
  "main session never does the work itself — one subagent per task", a second PreToolUse guard,
  the `rulebook_gate` tool (schema bytes 3,562 → 5,109).
