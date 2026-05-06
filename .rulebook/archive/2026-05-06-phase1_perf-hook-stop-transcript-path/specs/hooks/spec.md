# Hooks — Stop hook transcript resolution

## MODIFIED Requirements

### Requirement: Stop hook resolves transcript via payload
The system SHALL read the active session transcript path from the
`transcript_path` field of the Stop hook stdin payload, and MUST NOT
traverse `$HOME/.claude/projects` to discover it.

#### Scenario: Payload includes transcript_path
Given a Stop hook invocation whose stdin contains `{"transcript_path": "/path/to/session.jsonl", ...}`
When `check-context-and-handoff.sh` runs
Then the script reads the file size of `/path/to/session.jsonl` directly via `stat`
And no `find` traversal of `$HOME/.claude/projects` is performed.

#### Scenario: Payload omits transcript_path
Given a Stop hook invocation whose stdin does not include `transcript_path`
When `check-context-and-handoff.sh` runs
Then `transcript_size` remains `0`
And the script emits `{}` and exits 0 without raising an error.

#### Scenario: transcript_path points to a missing file
Given `transcript_path` is set but the file does not exist
When `check-context-and-handoff.sh` runs
Then `transcript_size` remains `0`
And the script emits `{}` and exits 0.
