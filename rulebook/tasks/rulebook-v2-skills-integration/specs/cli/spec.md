# CLI Specification

## ADDED Requirements

### Requirement: Simplified Init Command
The system SHALL provide a simplified initialization command that uses smart defaults and asks only essential questions to reduce onboarding friction.

#### Scenario: Init with minimal prompts
Given a user runs `rulebook init` in a new project
When the command executes
Then the system SHALL ask only two questions: (1) primary programming language, (2) whether to enable MCP server
And the system SHALL use sensible defaults for all other configuration options
And the system SHALL automatically detect languages, frameworks, and modules from the project

#### Scenario: Init with yes flag
Given a user runs `rulebook init --yes`
When the command executes
Then the system SHALL use all detected defaults without prompting
And the system SHALL enable MCP server by default
And the system SHALL use the first detected language as primary

#### Scenario: Git workflow as optional
Given a user runs `rulebook init`
When the command prompts for configuration
Then Git workflow actions SHALL be presented as optional (not default)
And the system SHALL explain that Git workflows depend on project maturity

### Requirement: Add Skill Command
The system SHALL provide a command to add skills after initialization, allowing users to incrementally add capabilities.

#### Scenario: Add a skill
Given a user runs `rulebook add <skill-name>`
When the command executes
Then the system SHALL validate that the skill exists
And the system SHALL check for conflicts with existing skills
And the system SHALL add the skill to the project configuration
And the system SHALL update AGENTS.md with the new skill's instructions
And the system SHALL display success message with skill description

#### Scenario: Add non-existent skill
Given a user runs `rulebook add non-existent-skill`
When the command executes
Then the system SHALL display an error message listing available skills
And the system SHALL exit with error code 1

#### Scenario: Add conflicting skill
Given a user runs `rulebook add <skill-name>` for a skill that conflicts with existing configuration
When the command executes
Then the system SHALL detect the conflict
And the system SHALL display a warning explaining the conflict
And the system SHALL ask for confirmation before proceeding
And the system SHALL allow the user to cancel the operation

## MODIFIED Requirements

### Requirement: Init Command Behavior
The system SHALL modify the init command to use smart defaults and reduce prompts while maintaining all existing functionality.

#### Scenario: Backward compatible init
Given an existing project with Rulebook v1.x configuration
When the user runs `rulebook init` or `rulebook update`
Then the system SHALL preserve existing configuration
And the system SHALL migrate to skills-based architecture automatically
And the system SHALL maintain all existing rules and directives

#### Scenario: Default configuration values
Given a user runs `rulebook init` with minimal prompts
When the system applies defaults
Then the system SHALL use: coverage threshold 95%, strict docs enabled, workflows enabled, modular structure enabled
And the system SHALL detect and include all detected languages, frameworks, and modules
And the system SHALL set Git push mode to 'manual' by default

