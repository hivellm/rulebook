# Rulebook — complexity-detector removal

## REMOVED Requirements

### Requirement: Project complexity scoring
The system SHALL NOT compute a project complexity score during `init` or
`update`. The rulebook MUST generate rules statically from templates,
without conditional scaling based on a complexity heuristic.

#### Scenario: init runs without complexity scan
Given an empty project directory
When the user runs `rulebook init`
Then no filesystem-wide complexity walk is performed
And the generated rules are identical regardless of project size.

#### Scenario: existing complexity field is ignored
Given a `.rulebook/rulebook.json` with a legacy `complexity` block
When the rulebook CLI reads the config
Then the field is silently ignored
And no error or warning is emitted.
