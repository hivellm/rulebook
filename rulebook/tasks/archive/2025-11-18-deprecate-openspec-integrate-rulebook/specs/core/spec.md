# Core Specification

## ADDED Requirements

### Requirement: Task Management System
The system SHALL provide a unified task management system that replaces OpenSpec functionality with built-in format validation and AI assistant guidance.

#### Scenario: Create new task
Given a user wants to create a new feature task
When they run `rulebook task create add-feature-name`
Then the system SHALL create a task following OpenSpec-compatible format with automatic validation

#### Scenario: Validate task format
Given a task has been created
When validation is requested
Then the system SHALL verify the task follows the correct format (Purpose, Requirements with SHALL/MUST, Scenarios with Given/When/Then)

#### Scenario: Archive completed task
Given a task has been completed
When the user runs `rulebook task archive task-id`
Then the system SHALL move the task to archive and update related specifications

### Requirement: Rulebook Task Format
The system SHALL enforce OpenSpec-compatible task format with the following requirements:
- Purpose section with minimum 20 characters
- Requirements using SHALL/MUST keywords
- Scenarios using Given/When/Then structure
- Proper delta headers (ADDED/MODIFIED/REMOVED/RENAMED)

#### Scenario: Task format validation
Given a task is created
When format validation runs
Then the system SHALL verify all format requirements are met and reject invalid tasks

### Requirement: Context7 Integration
The system SHALL require Context7 MCP for task creation to ensure correct format.

#### Scenario: Task creation with Context7
Given a user wants to create a task
When Context7 MCP is not available
Then the system SHALL display an error requiring Context7 MCP for task creation

#### Scenario: Task creation guidance
Given Context7 MCP is available
When a user creates a task
Then the system SHALL automatically fetch OpenSpec format documentation from Context7 and apply it

### Requirement: Migration from OpenSpec
The system SHALL automatically migrate existing OpenSpec tasks to Rulebook format.

#### Scenario: Migrate OpenSpec project
Given a project has OpenSpec tasks
When `rulebook update` is run
Then the system SHALL convert all OpenSpec tasks to Rulebook format and remove OpenSpec references

## MODIFIED Requirements

### Requirement: Module Detection
The system MUST detect project modules but SHALL NOT include OpenSpec as a supported module.

#### Scenario: Detect modules
Given a project has MCP configuration
When module detection runs
Then the system SHALL detect Vectorizer, Synap, Context7, GitHub, Playwright but SHALL NOT detect OpenSpec

### Requirement: Template Generation
The system SHALL generate AGENTS.md with Rulebook task directives instead of OpenSpec instructions.

#### Scenario: Generate AGENTS.md
Given a project is initialized or updated
When AGENTS.md is generated
Then it SHALL include directives to use Rulebook task system and reference `/rulebook/RULEBOOK.md` for task creation guidelines

