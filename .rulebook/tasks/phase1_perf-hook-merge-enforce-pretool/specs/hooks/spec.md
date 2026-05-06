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

## MODIFIED Requirements

### Requirement: Legacy enforcement scripts remain compatible
The system SHALL keep `enforce-no-deferred.sh`, `enforce-no-shortcuts.sh`,
and `enforce-mcp-for-tasks.sh` available as one-line shims that delegate to
the merged hook for one release cycle, so existing user `settings.json` files
do not break.

#### Scenario: Old settings.json points at deprecated shim
Given a user's `.claude/settings.json` still references `enforce-no-deferred.sh`
When the shim runs
Then it execs `enforce-pre-tool.sh` with the same stdin
And the resulting permission decision matches what the old script would have produced.
