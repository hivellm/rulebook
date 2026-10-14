## 1. Implementation
- [x] 1.1 Install/remove no-os-scheduling.sh with the tool gate setting — applyClaudeSettings installs `TOOL_GATE_SCRIPTS` (jev-gate.sh, no-os-scheduling.sh) only with `jevToolGate`; without it an unedited copy (shipped template or legacy-catalogue hash) is deleted and returned in `removedScripts`, which init/update/claude print
- [x] 1.2 Exclude .rulebook/.update-check from the installed-files count — scripts/measure-overhead.mjs
- [x] 1.3 Installed-files budget back to 20 or fewer — default init + update: 20 (was 22); ledger in docs/analysis/v7-performance/05-budget-and-metrics.md updated, v7.1.0–v7.4.0 file counts re-measured with the new method

## 2. Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation — README.md, docs/MCP_SERVER.md (tool gate "Scripts"), budget ledger
- [x] 2.2 Write tests covering the new behavior — tests/claude-settings-manager.test.ts, tests/os-scheduling-guard.test.ts, tests/hook-spawn-budget.test.ts (built CLI: default init, toolHook on/off via update)
- [x] 2.3 Run tests and confirm they pass
