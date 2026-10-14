# 03 — MCP server lifecycle across sessions

Measured 2026-10-14 (`work/chains.ps1`, `work/mcp-lifecycle/bench2.mjs`, `vtime*.mjs`,
`phase-timing.mjs`, `eof-test.mjs`, `killroot-*.mjs`). Init time is process spawn plus the MCP
`initialize` round-trip; figures are min/median/max of 3–5 runs after a warm-up, unless noted.

## F-013 — `npx … @latest` costs ~1 s more per session start, 3 extra processes and ~80 MB

- **Evidence:** `src/core/claude/claude-mcp.ts:42-46` (`buildMcpServerArgs`) writes
  `npx -y --package=@hivehub/rulebook@latest rulebook-mcp` into every project's `.mcp.json`.
- **Numbers:**

  | Launch style | Init (ms) | Processes | Working set / private |
  |---|---|---:|---|
  | `node <installed>/dist/mcp/rulebook-server.js` | 234–310 | 1 | 83 / 84 MB |
  | global `rulebook-mcp.cmd` shim | 267/283/318 | 2 | 92 / 90 MB |
  | **`npx @latest` (generated today)** | 931–1,734 | **4** | **200 / 189 MB** |
  | `npx` pinned `@7.4.0` | 975/1,156/1,172 | 4 | 201 / 189 MB |
  | legacy `npx -y @hivehub/rulebook@latest mcp-server` | 1,150/1,340/1,365 | 4 | 220 / 227 MB |
  | esbuild single-file bundle (experiment, 646 KB) | 131/163/181 | 1 | 78 / 80 MB |

  `rulebook --version` via npx: 1,046 ms (`@latest`), 842 ms (`--prefer-offline`), 835 ms
  (`--offline`) vs 179 ms with `node <path>`. So ~800–900 ms of every npx launch is npm's own startup and
  package scan, cached or not; the registry check adds only 150–200 ms. The first session after a
  release does a cold install: 12,442 ms measured, and concurrent starts serialize on npx's install lock.
  Earlier readings of 1.7–3.1 s were taken under heavier load.
- **Impact:** per session: ~0.85–1.1 s, 3 processes, ~80 MB private. For the 12 npx chains live at
  measurement time: 36 extra processes, ~970 MB private. Codex starts MCP servers in the background, so
  there the cost is memory, not first-turn latency.
- **Confidence:** high. **Rulebook-attributable:** yes.

## F-014 — 13 servers alive at once: no leak, but one Codex app-server holds 8 of them

- **Numbers:** 13 rulebook MCP servers in 49 processes, 1,480 MB working set / 1,865 MB private.
  12 are 4-process npx chains (client → `cmd.exe` → npx `node` → `cmd.exe` → server `node`), 1 is direct
  (this repo). Holders: Codex VS Code app-server pid 61456: 8 chains (started 10-13 01:39 … 10-14 03:17);
  another Codex app-server 1; three Claude sessions 1 each; this session the direct one. All parents are
  alive; no orphans. Of the 7 Assets3D chains under pid 61456, 3 are in use, 3 idle for ~3 h and 1 stale
  since 01:29: Codex records every thread as `open` and never reaps MCP children until it exits.
- **Impact:** the server count is driven by Codex keeping one full MCP set per thread; the npx form
  multiplies the cost of each set (F-013).
- **Confidence:** high. **Rulebook-attributable:** partly (launch form yes; per-thread retention is Codex's).

## F-015 — Three code paths write three different MCP entries, and none can pin or upgrade a v7 entry

- **Evidence:** `claude-mcp.ts:42-46` writes the slim `@latest rulebook-mcp` form; `src/cli/commands/mcp.ts:26`
  and `:103-105` (`rulebook mcp init`) and `src/core/workspace/legacy-migrator.ts:20` (`SIMPLIFIED_ARGS`)
  still write the legacy full-CLI form `@latest mcp-server`. `configureMcpJson` (`claude-mcp.ts:57-100`)
  rewrites an entry only when it has `--project-root`, `mcp-server` or lacks a needed `--workspace`.
  No code writes `.codex/config.toml` (see 05).
- **Numbers:** survey of 36 `.mcp.json` entries under E:/HiveLLM and E:/UzmiGames: 23 slim `@latest`,
  **12 legacy `mcp-server`** (1,340 ms, 4 processes, 220 MB each), 1 direct.
- **Confidence:** high. **Rulebook-attributable:** yes.

## F-016 — The server exits on client death only by accident, and leaves stale PID files on Windows

- **Numbers:** stdin end → exit in 13–24 ms; whole npx chain gone in 34–48 ms; killing the client's
  direct child kills all 4 within 30–34 ms. But there is no stdin `end`/`close` handler
  (`rulebook-server.ts:372-385` handles only SIGINT, SIGTERM, exit): the server exits because nothing else
  keeps the event loop alive. A control process that holds a timer survived its parent. PID files:
  Assets3D 9 (8 live), Synap 3 (1 stale), UzPainter 4 stale, Nexus 1 stale. On Windows a killed process
  never runs its exit handlers. The comment at `rulebook-server.ts:303` ("prevent multiple instances") is
  wrong: the files enforce nothing.
- **Impact:** any future timer, socket or watcher (chokidar is already a dependency) would make every
  server outlive its client.
- **Confidence:** high (Windows exit-handler behaviour inferred from stale files). **Rulebook-attributable:** yes.

## F-017 — 80 % of server startup is importing the MCP SDK

- **Numbers:** in-process startup 200–208 ms: importing `@modelcontextprotocol/sdk` server (208 modules:
  zod 84, ajv 63, zod-to-json-schema 39) 162–171 ms; rest of rulebook 20–22 ms; config/workspace lookups
  under 6 ms; `registerV7Tools` 2.2 ms. No network at startup. Tool calls: `tools/list` 3–5 ms, session
  context 1–3 ms, task list 1–6 ms, memory list 13–21 ms. A single-file bundle cut init to 147–163 ms.
- **Confidence:** high. **Rulebook-attributable:** yes (bundling is an option, not a defect).

## F-018 — Pinning alone gains little and has a trap on this machine

- **Numbers:** pinned `@7.4.0` saves 0–150 ms (−200 ms with `--prefer-offline`). Its value is that every
  session runs the same known version instead of re-installing at release time. Trap: in a folder whose
  own `package.json` is `@hivehub/rulebook` at the same version, npx skips its cache and runs the
  `rulebook-mcp` on PATH, here the stale global link (`MODULE_NOT_FOUND`); pinned launches failed 8/8 in
  such folders and succeeded 4/4 elsewhere.
- **Confidence:** high. **Rulebook-attributable:** partly.

## F-019 — The budget test does not test the launch command rulebook generates

- **Evidence:** `tests/v7-budgets.test.ts` spawns `node dist/...` directly. Limits: tools ≤ 8 (6), schema
  ≤ 5,140 bytes (5,109: 31 bytes of headroom), init ≤ 2,000 ms (≈ 290 ms measured).
- **Impact:** a regression back to npx (or to the legacy form) would pass CI.
- **Confidence:** high. **Rulebook-attributable:** yes.

## Options compared (per session start, against today's npx `@latest`)

| Option | Time saved | Processes saved | Memory saved | Main cost |
|---|---:|---:|---:|---|
| Pin the version, `update` rewrites entries | 0–200 ms | 0 | 0 | stale-global trap (F-018) |
| `node` + absolute path, in user/local scope | 0.85–1.1 s | 3 | ~80 MB private | machine-specific path, rewrite on upgrade |
| Global `rulebook-mcp` bin | 0.8–1.1 s | 2 | ~73 MB | needs a global install that can drift or break |
| Shared per-machine daemon + stdio shim | small | 0 (shim stays) | 10–40 MB | high complexity, single point of failure |
| Bundled server entry | ~100 ms | 0 | ~5 MB | build step |
| Idle shutdown inside the server | — | — | — | clients do not restart stdio servers: lost tools |
