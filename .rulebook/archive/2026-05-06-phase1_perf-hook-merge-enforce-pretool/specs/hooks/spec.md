# Hooks — merged PreToolUse enforcement

## ADDED Requirements

### Requirement: Single PreToolUse enforcement hook
The system SHALL register exactly one PreToolUse hook that consolidates the
deny rules previously enforced by `enforce-no-deferred.sh`,
`enforce-no-shortcuts.sh`, and `enforce-mcp-for-tasks.sh`.

#### Scenario: tasks.md write containing "deferred"
Given a `Write` tool call targeting `path/to/tasks.md`
And the new content matches `\b(deferred|skip(ped)?|later|todo)\b`
When the merged enforcement hook runs
Then it emits `permissionDecision: deny` with the no-deferred reason string
And no further tool input parsing occurs.

#### Scenario: Source file write containing TODO
Given an `Edit` tool call targeting `src/foo.ts`
And the new content matches `//\s*TODO`
When the merged enforcement hook runs
Then it emits `permissionDecision: deny` with the no-shortcuts reason string.

#### Scenario: Manual task directory creation via Bash
Given a `Bash` tool call whose command matches `mkdir.*\.rulebook/tasks/`
When the merged enforcement hook runs
Then it emits `permissionDecision: deny` with the mcp-for-tasks reason string.

#### Scenario: Tool call passes all checks
Given a tool call that does not match any of the deny rules
When the merged enforcement hook runs
Then it emits `permissionDecision: allow`
And only one `bash + node` process tree is spawned for the entire check.

## REMOVED Requirements

### Requirement: Legacy enforcement scripts
The system SHALL NOT ship `enforce-no-deferred.sh`,
`enforce-no-shortcuts.sh`, or `enforce-mcp-for-tasks.sh`. These three
scripts MUST be deleted from both `templates/hooks/` and any project's
`.claude/hooks/`. No deprecation shim is provided.

### Requirement: settings.json migration on update
The system SHALL strip stale `enforce-no-deferred`, `enforce-no-shortcuts`,
and `enforce-mcp-for-tasks` entries from `.claude/settings.json` whenever
`syncClaudeSettings` runs, regardless of whether `qualityEnforcement` is
enabled. This ensures `rulebook update` cleans up old installs without
extra user action.

#### Scenario: rulebook update after upgrade
Given a user's `.claude/settings.json` still references the three legacy hook scripts
When the user runs `rulebook update` (which calls `syncClaudeSettings`)
Then the legacy entries are removed from the PreToolUse list
And a single `enforce-pre-tool.sh` entry is registered in their place.
