## 1. Implementation
- [x] 1.1 hook-main.ts entry + bin, importing only hook.ts
- [x] 1.2 Install-time resolution and validation of the hook entry path
- [x] 1.3 Exec-form hook entries in generated settings (Windows-safe interpreter path)
- [x] 1.4 Project-dir fallback for Codex
- [x] 1.5 Benchmark: end-to-end and gate-off startup, median of 3, recorded in the ledger

## Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (CHANGELOG entry + affected guides/specs)
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass (type-check → lint → tests)

## Results
- Benchmark (Windows, rulebook repo, real Jev calls, median of 3 after one warm-up):
  - v7.5 exec form `node dist/cli/hook-main.js prompt-gate`, gate on: 499 ms (457–509); target ≤ 650, v7.4 baseline 929 ms.
  - same, `RULEBOOK_GATE=off` start-up: 91 ms (90–120); target ≤ 150, v7.4 baseline 401 ms.
  - for comparison, the v7.5 hook code through the v7.4 path (bash wrapper + full CLI `dist/index.js`): 670 ms on / 331 ms off.
- Ledger rows are written by phase3_budget-tests-and-ledger / phase4_v750-release; the numbers live here and in docs/MCP_SERVER.md.
- Exec form verified in https://code.claude.com/docs/en/hooks: `args` spawns `command` without a shell and substitutes `${CLAUDE_PROJECT_DIR}` in each element; `node` + script path is the documented Windows-safe form (`.cmd` shims cannot be spawned).
- The opt-in tool gate keeps the bash wrapper: it runs the OS-scheduling guard before Jev.
- CHANGELOG entry: written by the release step.
