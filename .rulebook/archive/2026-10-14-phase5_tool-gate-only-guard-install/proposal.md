# Proposal: phase5_tool-gate-only-guard-install

## Why
no-os-scheduling.sh is still installed in every project although only the opt-in tool gate runs it since 7.5 moved scheduling to permissions.deny; installed files are 22, over the 20-file budget.

## What Changes
Install the scheduling script only when gate.toolHook.enabled is true and remove a rulebook-owned copy otherwise; stop counting the .update-check cache as an installed file.

## Impact
- Affected specs: none
- Affected code: src/core/claude/claude-settings-manager.ts, scripts/measure-overhead.mjs
- Breaking change: NO
- User benefit: none
