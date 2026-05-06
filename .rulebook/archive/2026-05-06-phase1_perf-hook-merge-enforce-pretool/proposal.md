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
- Update `src/core/claude-settings-manager.ts` so it registers one hook
  entry, and **always removes** the legacy `enforce-no-deferred` /
  `enforce-no-shortcuts` / `enforce-mcp-for-tasks` signatures during sync —
  this gives users a clean migration path on `rulebook update`.
- Delete the three legacy scripts (`enforce-no-deferred.sh`,
  `enforce-no-shortcuts.sh`, `enforce-mcp-for-tasks.sh`) from both
  `templates/hooks/` and `.claude/hooks/`. No deprecation shims — the
  settings-manager rewrite cleans up stale entries on next sync.

## Impact

- Affected specs: none functionally (all three deny rules preserved
  byte-for-byte). Performance note added.
- Affected code:
  - New: `templates/hooks/enforce-pre-tool.sh`,
    `.claude/hooks/enforce-pre-tool.sh`
  - Modified: `src/core/claude-settings-manager.ts`
    (single registration + LEGACY_SIGNATURES cleanup pass)
  - Deleted: `templates/hooks/enforce-no-deferred.sh`,
    `templates/hooks/enforce-no-shortcuts.sh`,
    `templates/hooks/enforce-mcp-for-tasks.sh`,
    plus their `.claude/hooks/` mirrors
- Breaking change: minor — users running `rulebook update` after upgrading
  get their `settings.json` rewritten automatically. Users who skip
  `rulebook update` see the orphan settings entries fail to invoke
  (deleted scripts), but the hook system continues running the rest.
- User benefit: ~280 ms saved per tool call; ~1–1.5 s saved per typical turn.
