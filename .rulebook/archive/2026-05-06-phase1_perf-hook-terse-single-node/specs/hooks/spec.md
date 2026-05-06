# Hooks — terse-mode-tracker single-node parse

## MODIFIED Requirements

### Requirement: Terse hook spawns at most one node process per turn
The system SHALL invoke `node` at most once during a UserPromptSubmit hook
turn, and SHALL skip the `node` invocation entirely when the user prompt
contains no terse-mode trigger token AND the active flag is unchanged.

#### Scenario: Prompt has no terse trigger
Given a user prompt that does not contain any of the substrings
`/rulebook-terse`, `terse mode`, `be terse`, `stop terse`, `disable terse`,
`normal mode`, or `less tokens`
When `terse-mode-tracker.sh` runs
Then the script does not invoke `node` to parse stdin
And the active mode is read from the flag file via pure bash
And the appropriate attention anchor is emitted (or none if no mode is active).

#### Scenario: Prompt activates terse mode
Given a user prompt containing `/rulebook-terse ultra`
When `terse-mode-tracker.sh` runs
Then `node` is invoked exactly once to parse stdin and resolve `default_mode`
And the resolved fields are extracted in pure bash thereafter
And the flag file is written via the existing `safe_write_flag` helper.

#### Scenario: Symlinked flag path
Given `${PROJECT_ROOT}/.rulebook/.terse-mode` is a symbolic link
When `terse-mode-tracker.sh` runs
Then no write occurs (existing safety preserved)
And no `node` process is spawned for the write path.
