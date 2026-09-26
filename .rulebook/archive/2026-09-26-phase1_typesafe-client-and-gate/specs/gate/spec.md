# Gate Specification

## ADDED Requirements

### Requirement: Jev entry gate
The system SHALL expose a `rulebook_gate` MCP tool and a `rulebook gate` CLI
command that send the operator prompt plus a bounded project description to
TypeSafe System One (Jev) in one call and return a `routing` the main session
acts on.

#### Scenario: Decided routing
Given a TypeSafe key is configured and Jev answers every question above its threshold
When `rulebook_gate {prompt}` is called
Then the result MUST have `available: true`, a filled `routing`, an empty `undecided` list, `elapsedMs` and `stateBytes`

#### Scenario: Undecided fields
Given Jev answers `kind` with confidence below 0.6 and `parallel` with noul 0.5
When the gate interprets the answers
Then `routing.kind` and `routing.parallel` MUST be null and both ids MUST be listed in `undecided`

### Requirement: Degradation without a key or network
The gate MUST never throw and never block; when Jev cannot be used it SHALL
return `available: false` with a reason and an instruction to fall back to the
CLAUDE.md Orchestration rules.

#### Scenario: No key
Given neither `process.env.TYPESAFE_API_KEY` nor `<root>/.env` holds a key
When the gate is called twice in the same process
Then both results MUST have `reason: "no-key"` and only the first MUST carry the key `instructions`

#### Scenario: Disabled
Given `RULEBOOK_GATE=off`
When the gate is called
Then it MUST return `reason: "disabled"` without any network call

### Requirement: Secret hygiene
The client MUST send the key only as a Bearer header and MUST NOT include it in
any error message, result, or log line; `.env` parsing SHALL read only
`TYPESAFE_API_KEY` and SHALL NOT modify `process.env`.

#### Scenario: Error message redaction
Given the key `ts_secret123` and a 401 response
When the client raises its error
Then the error message MUST NOT contain `ts_secret123`

### Requirement: Bounded state and decision log
The state sent to Jev SHALL stay at or under 8192 bytes, trimming in the order
notes, skills, task list, skill candidates, open questions, prompt; the decision
log SHALL be written to `.rulebook/logs/gate.jsonl` only when `features.logging`
is true and MUST contain a prompt hash, never the prompt text or the key.

#### Scenario: Oversized prompt
Given a prompt longer than 4096 characters
When the state is built
Then the prompt MUST end with the truncation marker and `stateBytes` MUST be at most 8192

#### Scenario: Logging off
Given `features.logging` is false
When a gate call completes
Then no `gate.jsonl` line MUST be written
