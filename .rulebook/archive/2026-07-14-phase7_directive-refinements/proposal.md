# Proposal: phase7_directive-refinements

Source: GitHub issues #18, #20, #22, #23 (external v7-perf audit)

## Why

Four generated directives still fight frontier-model performance: Tier-1 rule 6
forbids parallel fan-out across independent checklist items (contradicts P0);
git rules ban branch create/switch/merge, blocking the GitHub-native PR flow the
harness itself instructs ("if on the default branch, branch first"); the MCP
reference says "prefer MCP over shell", pointing at the slower surface; and the
full test suite is mandated before EVERY commit, pushing agents toward giant
batched commits.

## What Changes

- prohibitions rule 6 → "Respect task dependencies" (order = dependencies;
  independent items may run in parallel); same rewording in rulebook.md,
  agents-lean.md, claude-md.md, rulebook-task-apply.md; P0 test extended.
- Git rules split by blast radius: destructive ops keep requiring
  authorization; branching/switching/merging AGENT-created branches and git
  worktree are autonomous; never touch shared checkouts with foreign changes.
- mcp-tool-reference becomes a neutral availability index (cheapest surface).
- Quality gate tiered: commit = type-check + lint + affected tests;
  push/PR/archive = full suite; hooks are the floor.

## Impact

- Affected specs: prohibitions, git, quality (regenerated)
- Affected code: templates/core/*, templates/git/git-workflow.md,
  templates/commands/rulebook-task-apply.md, mcp-reference-generator.ts, tests
- Breaking change: NO (directive semantics only)
- User benefit: parallel fan-out unblocked, PR-native autonomy, cheap commits
