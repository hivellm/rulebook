# Proposal: phase5_v7-migration-benchmarks

Source: docs/analysis/v7-performance/

## Why

v7 changes the generated file set, hook wiring, and MCP tool names — existing v6
projects must upgrade in one safe command or they will keep paying v6 overhead
(and keep hooks pointing at deleted scripts). Budgets from the analysis
(05-budget-and-metrics.md) must be enforced by CI so overhead can never silently
regress back toward v6 levels.

## What Changes

- `rulebook update` v6→v7 migration: rewrites CLAUDE.md/AGENTS.md lean,
  preserves AGENTS.override.md, strips retired hooks via signatures, removes
  rulebook-owned retired files, migrates `.mcp.json` to the slim entrypoint;
  `--dry-run` prints the diff summary first.
- CI acceptance checks: token budget (≤2,500), hook audit (no
  Stop/UserPromptSubmit/SessionStart/PreToolUse-Agent), MCP schema budget
  (≤8 tools / ≤3,600 bytes), orchestration-freedom fixture test (P0), MCP
  startup benchmark (<150 ms).
- Docs: README, CHANGELOG, migration guide with measured before/after numbers.

## Impact

- Affected specs: RULEBOOK.md, RULEBOOK_MCP.md (migration notes)
- Affected code: src/cli/commands/update.ts, src/core/claude/*, CI workflows,
  tests/fixtures
- Breaking change: NO (this phase delivers the safe path for the breaking
  changes of phases 1–4)
- User benefit: one-command upgrade; guaranteed non-regression of the v7
  performance budgets
