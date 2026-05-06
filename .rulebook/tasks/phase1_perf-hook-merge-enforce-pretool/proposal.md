# Proposal: phase1_perf-hook-merge-enforce-pretool

Source: hivellm/rulebook#15

## Why

Three independent PreToolUse hooks (`enforce-no-deferred.sh`,
`enforce-no-shortcuts.sh`, `enforce-mcp-for-tasks.sh`) each spawn their own
`bash + node` process tree to parse the same stdin payload and run a single
regex check. On Windows that costs ~143 ms × 3 ≈ **429 ms per tool call**, and
a typical turn issues 3–5 tool calls, so this hook trio alone burns **1.3–2.1 s
per turn**.

The three checks are read-only inspections of the same `tool_input` JSON.
Merging them into one hook reduces the per-tool-call cost to a single
`bash + node` invocation while preserving every existing deny rule.

## What Changes

- Add `templates/hooks/enforce-pre-tool.sh` that:
  - Parses `tool_name` and `tool_input` from stdin once.
  - Runs the three existing checks (`no-deferred` for `tasks.md` writes,
    `no-shortcuts` for source-file writes, `mcp-for-tasks` for manual task
    creation) inline in a single `node` call.
  - Emits a single `permissionDecision` (deny on first match, allow otherwise)
    with the corresponding `permissionDecisionReason` from the original hooks.
- Update the rulebook installer (`src/cli/commands/init.ts` /
  `templates/hooks-config.json` or wherever `PreToolUse` is registered) to
  register one hook entry instead of three.
- Mirror the change in `.claude/hooks/` and `.claude/settings.json` for this
  repo's own config.
- Keep the three existing scripts in `templates/hooks/` for one release as
  deprecated shims that delegate to `enforce-pre-tool.sh`, so users on older
  `settings.json` files do not break. Remove them in the next major.

## Impact

- Affected specs: none functionally (all three deny rules preserved
  byte-for-byte). Performance note added.
- Affected code:
  - New: `templates/hooks/enforce-pre-tool.sh`,
    `.claude/hooks/enforce-pre-tool.sh`
  - Modified: `templates/settings.template.json` (or hook registration source),
    `.claude/settings.json`
  - Modified: `templates/hooks/enforce-no-deferred.sh`,
    `templates/hooks/enforce-no-shortcuts.sh`,
    `templates/hooks/enforce-mcp-for-tasks.sh` (deprecated shims)
- Breaking change: NO (deprecation shims maintain compatibility for one release).
- User benefit: ~280 ms saved per tool call; ~1–1.5 s saved per typical turn.
