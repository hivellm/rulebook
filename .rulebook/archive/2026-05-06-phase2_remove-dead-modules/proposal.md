# Proposal: phase2_remove-dead-modules

## Why

Audit of `src/core/` identified five modules that are either unreachable
from the CLI/MCP surface or duplicate functionality that Claude Code already
provides natively. Keeping them in-tree forces type-check, lint, and
maintenance work for code nobody runs.

| Module | LOC | Status |
|--------|-----|--------|
| `core/telemetry.ts` | 86 | Config flag exists; module never instantiated. Dead since v5.3.0 experiment. |
| `core/auto-fixer.ts` | 132 | Imported only by tests. No CLI/MCP wiring. |
| `core/review-manager.ts` | 430 | No CLI/MCP wiring. Decision/analysis managers cover the same ground. |
| `core/watcher.ts` | 26 | Thin wrapper, no CLI entry point. |
| `core/compact-context-manager.ts` | 70 | Seeds `.rulebook/COMPACT_CONTEXT.md`. Redundant with Claude Code's native `/compact` reload of `CLAUDE.md` imports — own comments call it "defense-in-depth". |

Combined: ~750 LOC + their test scaffolding.

## What Changes

- Delete the five source files listed above.
- Remove their imports/exports from `src/index.ts` and any re-exports.
- Remove the single `init.ts` callsite for `compact-context-manager` and the
  template seed it copies.
- Strip the `telemetry` config block from `src/core/config-manager.ts` and
  any references in `detector.ts` / `mcp/rulebook-server.ts` (config-only,
  no runtime usage today).
- Delete tests that target only these modules:
  - `tests/auto-fixer*.test.ts`
  - `tests/review-manager*.test.ts`
  - `tests/telemetry*.test.ts`
  - `tests/watcher*.test.ts`
  - `tests/compact-context*.test.ts`
- Verify `src/core/modern-console.ts` still has live consumers; if it was
  reachable only through `watcher.ts`, remove it as well. Otherwise leave
  it alone (load-bearing for downstream tooling).

## Impact

- Affected specs: none directly. Update `RULEBOOK.md` if it references any
  of these modules (likely only `compact-context-manager`).
- Affected code:
  - Deleted: `src/core/telemetry.ts`, `src/core/auto-fixer.ts`,
    `src/core/review-manager.ts`, `src/core/watcher.ts`,
    `src/core/compact-context-manager.ts`
  - Possibly deleted: `src/core/modern-console.ts` (verify first)
  - Modified: `src/core/config-manager.ts`, `src/cli/commands/init.ts`,
    `src/index.ts`, `src/mcp/rulebook-server.ts`
  - Test files removed accordingly
- Breaking change: NO (no public API surface).
- User benefit: ~750 LOC removed, smaller install and faster type-check.
