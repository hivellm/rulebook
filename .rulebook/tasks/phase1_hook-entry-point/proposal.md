# Proposal: phase1_hook-entry-point

## Why
`jev-gate.sh prompt` costs 929 ms end-to-end: ~175 ms of nested shells, 118–140 ms loading the whole CLI (dist/index.js imports every command) and a CLI lookup that falls back to a broken global install in every project except this repo (docs/analysis/multi-session-performance/02-jev-gate.md F-007, F-008, F-012).

## What Changes
- New bin `rulebook-hook` → `dist/cli/hook-main.js` that imports only the hook module.
- Generated hook entries use exec form (no bash wrapper) with the CLI path resolved and validated at install/update time.
- Codex: derive the project dir without CLAUDE_PROJECT_DIR.

## Impact
- Affected specs: docs/analysis/multi-session-performance/08-execution-plan.md
- Affected code: src/cli/hook-main.ts (new), package.json (bin), src/core/claude/claude-settings-manager.ts, templates/hooks/jev-gate.sh, tests/claude-settings-manager.test.ts
- Breaking change: NO
- User benefit: Gate end-to-end ≤ 650 ms (from 929 ms); gate-off startup ≤ 150 ms (from 401 ms); the gate works in every project, not only this repo.
