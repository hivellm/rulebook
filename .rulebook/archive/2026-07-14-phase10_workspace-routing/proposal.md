# Proposal: phase10_workspace-routing

Source: GitHub issue #24 (external v7-perf audit)

## Why

Workspace mode escaped the diet: CRITICAL/ALWAYS projectId ceremony, a
mandatory spec read before the first MCP call, and a capture-in-BOTH-projects
quota. Routing is computable server-side from paths.

## What Changes

- v7 tools accept optional path hint; projectId resolved by longest-prefix
  match against workspace project roots; explicit projectId stays as override.
- AGENTS.md workspace injection becomes one calm line.
- workspace.md: capture once in the owning project; reference elsewhere.

## Impact

- Affected code: v7-tools.ts (resolveRoot), generator.ts, templates/core/workspace.md, tests
- Breaking change: NO
- User benefit: wrong-project calls near-impossible; zero routing ceremony
