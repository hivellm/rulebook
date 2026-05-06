# Proposal: phase2_remove-multi-tool-generator

## Why

`src/core/multi-tool-generator.ts` (~150 LOC) generates stub MCP
multi-tool definitions during `init`. The generator is single-callsite
(`init.ts`), has no tests beyond a smoke check, and produces stubs that
require manual completion before they do anything useful — a half-built
feature.

The MCP server in `src/mcp/rulebook-server.ts` already exposes a
hand-curated set of tools that are tested and integrated with hooks. The
multi-tool generator pre-dates that consolidation and is no longer the
intended path for adding MCP tools.

## What Changes

- Delete `src/core/multi-tool-generator.ts`.
- Remove the call from `src/cli/commands/init.ts` and the corresponding
  template assets under `templates/multi-tool*` (if any).
- Drop tests targeting only this module.

## Impact

- Affected specs: none (no public spec references this generator).
- Affected code:
  - Deleted: `src/core/multi-tool-generator.ts`
  - Modified: `src/cli/commands/init.ts`, `src/index.ts`
  - Tests removed: `tests/multi-tool*.test.ts`
- Breaking change: NO. Users had to hand-edit the stubs anyway, so removal
  is functionally invisible.
- User benefit: 150 LOC removed; one less half-built feature to explain.
