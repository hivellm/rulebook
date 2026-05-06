# Rulebook — Ralph autonomous loop removal

## REMOVED Requirements

### Requirement: Ralph autonomous loop subsystem
The system SHALL NOT ship the Ralph autonomous loop. The `rulebook ralph
init|run|status|history|pause|resume` CLI surface, the `rulebook_ralph_*`
MCP tools, the `templates/ralph/` shell/batch scripts, the Ralph slash
commands, the `templates/ides/cursor-mdc/ralph.mdc` IDE template, and the
`.rulebook/ralph/history/` iteration store MUST be removed from the project.

The standard rulebook task workflow (`rulebook_task_create`,
`rulebook_task_update`, `rulebook_task_archive`) and Claude Code's built-in
`/loop` skill replace its functionality.

#### Scenario: rulebook CLI no longer exposes ralph
Given a fresh installation of `@hivellm/rulebook`
When the user runs `rulebook --help`
Then no `ralph` subcommand is listed
And invoking `rulebook ralph run` exits with the standard "unknown command" error.

#### Scenario: MCP server omits ralph tools
Given a Claude Code session connected to the rulebook MCP server
When the agent enumerates available tools
Then no tool whose name starts with `rulebook_ralph_` is present.

#### Scenario: rulebook init does not scaffold ralph
Given a project with no prior rulebook installation
When the user runs `rulebook init`
Then `templates/ralph/` is not copied
And no `.rulebook/ralph/` directory is created
And no `ralph.mdc` is written under `.cursor/rules/` or any other IDE template path.

## MODIFIED Requirements

### Requirement: AGENTS.md no longer documents Ralph
The team-shared `AGENTS.md` SHALL NOT contain any "Ralph Autonomous Loop"
section, and SHALL NOT reference `rulebook ralph` commands or PRD-based
user-story tracking.

#### Scenario: Updated AGENTS.md
Given the regenerated `AGENTS.md` after removal
When a reader searches for the substring `Ralph`
Then no match is found outside `CHANGELOG.md` historical entries.
