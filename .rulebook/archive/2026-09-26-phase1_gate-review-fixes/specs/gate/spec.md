# Gate review fixes

## ADDED Requirements

### Requirement: Update preserves persisted config
`rulebook update` SHALL carry `installedAt` forward from the existing config and MUST keep
`integrations` as persisted after the TypeSafe decision; only `version` and `updatedAt` are
refreshed. `installedAt` MUST fall back to the current time only when absent.

#### Scenario: Stored TypeSafe opt-out survives an update
Given a rulebook.json with `installedAt` "2026-01-01T00:00:00.000Z" and `integrations.typesafe.enabled` false
When the update config rebuild runs
Then the rebuilt config keeps that `installedAt` and `integrations.typesafe.enabled` false, with the current version and a new `updatedAt`

### Requirement: TypeSafe setup requires Claude Code
`rulebook init` and `rulebook update` MUST run the TypeSafe decision and setup only when Claude
Code is detected; otherwise they SHALL print "TypeSafe skipped: Claude Code not detected" and
persist nothing.

#### Scenario: No Claude Code
Given a machine without a `~/.claude` directory
When `rulebook update` runs
Then no `integrations.typesafe` entry is written and no `claude plugin` command runs

### Requirement: Gate creates nothing in unmanaged projects
The `rulebook_gate` MCP tool MUST NOT create files or directories in a project that has no
`.rulebook/rulebook.json`.

#### Scenario: Gate in a bare directory
Given a project directory without `.rulebook/`
When `rulebook_gate` is called with a prompt and a key
Then the call returns a result and `.rulebook/` still does not exist

### Requirement: Gate state hard cap
The gate state sent to Jev SHALL NOT exceed 8192 UTF-8 bytes; when the trims leave it larger,
the prompt MUST be cut on a code-point boundary and end with the truncation marker.

#### Scenario: Four-byte code points
Given a prompt of thousands of 4-byte emoji and long task ids
When the gate state is built
Then its JSON is at most 8192 bytes and the prompt holds only whole emoji plus the marker

### Requirement: Choice answers are validated
A Jev choice answer whose `choice` is not one of the question's criteria keys MUST be treated
as undecided; a `choice` that is not a string SHALL make the response a bad response.

#### Scenario: Unknown agent type
Given Jev answers `agent` with "wizard"
When the answers are interpreted
Then `agentType` is null and `agent` is listed as undecided

### Requirement: Gate check honours the kill switch first
`rulebook gate --check` MUST return `disabled` under `RULEBOOK_GATE=off` without reading `.env`.

#### Scenario: Disabled with a key in .env
Given `RULEBOOK_GATE=off` and a `.env` holding a key
When `rulebook gate --check` runs
Then it reports disabled with no key source

### Requirement: Inline comments in .env
An unquoted `TYPESAFE_API_KEY` value in `.env` SHALL have a trailing ` # comment` removed.

#### Scenario: Commented key line
Given `.env` contains `TYPESAFE_API_KEY=ts_abc # personal key`
When the key is resolved
Then the key is `ts_abc`
