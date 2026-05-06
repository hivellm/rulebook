# Rulebook — health-scorer removal

## REMOVED Requirements

### Requirement: doctor health subcommand
The system SHALL NOT expose a `rulebook doctor health` subcommand. The
project health signal MUST come from `rulebook doctor run`, which already
reports type-check, lint, test, and coverage status.

#### Scenario: doctor health is gone
Given the post-change CLI
When the user runs `rulebook doctor health`
Then commander exits with the standard "unknown command" error code.

#### Scenario: doctor run unchanged
Given a project with passing checks
When the user runs `rulebook doctor run`
Then the existing diagnostic output is produced
And no health-score line is included.
