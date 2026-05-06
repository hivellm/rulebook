# Rulebook — cursor-mdc generator removal

## REMOVED Requirements

### Requirement: Cursor MDC rule generation
The system SHALL NOT generate `.cursor/rules/*.mdc` files. Cursor users
MUST rely on the shared `AGENTS.md`, which Cursor reads natively.

#### Scenario: init does not write MDC files
Given an empty project directory
When the user runs `rulebook init` with Cursor selected as an editor
Then no `.cursor/rules/` directory is created
And `AGENTS.md` is generated as usual.

#### Scenario: update removes the cursor-mdc step silently
Given an existing project with `.cursor/rules/*.mdc` from a prior version
When the user runs `rulebook update`
Then the existing files are left untouched (no destructive deletion)
And no new `.mdc` files are written.
