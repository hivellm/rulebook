# MCP Skills Management Specification

## ADDED Requirements

### Requirement: List Skills MCP Function
The system SHALL provide an MCP function to list all available skills, enabling programmatic discovery of capabilities.

#### Scenario: List all skills via MCP
Given an AI model wants to discover available skills
When it calls the `rulebook_skill_list` MCP function
Then the system SHALL return a list of all available skills
And each skill SHALL include: name, description, category, enabled status
And the system SHALL organize skills by category
And the system SHALL return structured JSON response

#### Scenario: List skills with filter
Given an AI model wants to filter skills by category
When it calls the `rulebook_skill_list` MCP function with category filter
Then the system SHALL return only skills matching the category
And the system SHALL return empty list if no skills match
And the system SHALL validate the category parameter

### Requirement: Show Skill Details MCP Function
The system SHALL provide an MCP function to retrieve detailed information about a specific skill.

#### Scenario: Show skill details via MCP
Given an AI model wants to view skill details
When it calls the `rulebook_skill_show` MCP function with skill name
Then the system SHALL return the skill's SKILL.md content
And the system SHALL return skill metadata (name, description, category)
And the system SHALL return enabled status
And the system SHALL return dependencies or conflicts if any
And the system SHALL return error if skill doesn't exist

### Requirement: Enable Skill MCP Function
The system SHALL provide an MCP function to enable a skill programmatically.

#### Scenario: Enable skill via MCP
Given an AI model wants to enable a skill
When it calls the `rulebook_skill_enable` MCP function with skill name
Then the system SHALL validate that the skill exists
And the system SHALL check for conflicts with existing skills
And the system SHALL add the skill to project configuration
And the system SHALL update AGENTS.md with the skill's instructions
And the system SHALL return success response with skill details

#### Scenario: Enable conflicting skill via MCP
Given an AI model tries to enable a skill that conflicts
When it calls the `rulebook_skill_enable` MCP function
Then the system SHALL detect the conflict
And the system SHALL return error response with conflict details
And the system SHALL NOT modify the configuration
And the system SHALL suggest resolution options

### Requirement: Disable Skill MCP Function
The system SHALL provide an MCP function to disable a skill programmatically.

#### Scenario: Disable skill via MCP
Given an AI model wants to disable a skill
When it calls the `rulebook_skill_disable` MCP function with skill name
Then the system SHALL validate that the skill is currently enabled
And the system SHALL remove the skill from project configuration
And the system SHALL remove the skill's instructions from AGENTS.md
And the system SHALL return success response
And the system SHALL preserve all other skills and customizations

#### Scenario: Disable non-enabled skill via MCP
Given an AI model tries to disable a skill that isn't enabled
When it calls the `rulebook_skill_disable` MCP function
Then the system SHALL return error response indicating skill is not enabled
And the system SHALL NOT modify the configuration

### Requirement: MCP Function Error Handling
The system SHALL provide structured error responses for all skills management MCP functions with proper error codes and messages.

#### Scenario: Handle invalid skill name
Given an AI model calls a skills MCP function with invalid skill name
When the function executes
Then the system SHALL return error response with error code
And the system SHALL include descriptive error message
And the system SHALL suggest valid skill names if available
And the system SHALL use consistent error format across all functions

#### Scenario: Handle missing configuration
Given an AI model calls a skills MCP function but .rulebook is missing
When the function executes
Then the system SHALL return error response indicating configuration not found
And the system SHALL suggest running `rulebook init` or `rulebook mcp init`
And the system SHALL use appropriate error code

## MODIFIED Requirements

### Requirement: MCP Server Registration
The system SHALL modify the MCP server to register new skills management functions alongside existing task management functions.

#### Scenario: Register skills functions
Given the MCP server starts
When it registers functions
Then it SHALL register `rulebook_skill_list` function
And it SHALL register `rulebook_skill_show` function
And it SHALL register `rulebook_skill_enable` function
And it SHALL register `rulebook_skill_disable` function
And it SHALL maintain all existing task management functions
And it SHALL use consistent function naming and schema patterns

