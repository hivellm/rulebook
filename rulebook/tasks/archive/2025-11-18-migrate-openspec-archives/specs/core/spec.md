# Core Specification

## ADDED Requirements

### Requirement: Archive Migration
The system SHALL migrate all archived OpenSpec tasks from `/openspec/changes/archive/` to `/rulebook/tasks/archive/` preserving archive dates and structure.

#### Scenario: Migrate archived tasks
Given a project has archived OpenSpec tasks in `/openspec/changes/archive/`
When `rulebook update` is run
Then the system SHALL migrate all archived tasks to `/rulebook/tasks/archive/` with preserved dates and structure

#### Scenario: Preserve archive dates
Given an archived OpenSpec task has a date prefix (e.g., `2025-01-15-task-id`)
When migration occurs
Then the system SHALL preserve the date prefix in the new location

### Requirement: OpenSpec Command Removal
The system SHALL remove all OpenSpec commands from `.cursor/commands/` directory.

#### Scenario: Remove OpenSpec commands
Given OpenSpec commands exist in `.cursor/commands/`
When migration runs
Then the system SHALL remove `openspec-proposal.md`, `openspec-archive.md`, and `openspec-apply.md`

### Requirement: Rulebook Command Creation
The system SHALL create Rulebook task commands in `.cursor/commands/` following the OpenSpec command pattern.

#### Scenario: Create task create command
Given the project uses Cursor IDE
When migration completes
Then the system SHALL create `.cursor/commands/rulebook-task-create.md` with task creation instructions

#### Scenario: Create task list command
Given the project uses Cursor IDE
When migration completes
Then the system SHALL create `.cursor/commands/rulebook-task-list.md` with task listing instructions

#### Scenario: Create task show command
Given the project uses Cursor IDE
When migration completes
Then the system SHALL create `.cursor/commands/rulebook-task-show.md` with task details instructions

#### Scenario: Create task validate command
Given the project uses Cursor IDE
When migration completes
Then the system SHALL create `.cursor/commands/rulebook-task-validate.md` with validation instructions

#### Scenario: Create task archive command
Given the project uses Cursor IDE
When migration completes
Then the system SHALL create `.cursor/commands/rulebook-task-archive.md` with archiving instructions

## MODIFIED Requirements

### Requirement: Validation Logic
The system SHALL correctly validate scenario format, only reporting errors when scenarios actually use 3 hashtags instead of 4.

#### Scenario: Validate correct format
Given a spec.md file has scenarios with 4 hashtags (`#### Scenario:`)
When validation runs
Then the system SHALL NOT report format errors for these scenarios

#### Scenario: Report incorrect format
Given a spec.md file has scenarios with 3 hashtags (`### Scenario:`)
When validation runs
Then the system SHALL report an error indicating scenarios must use 4 hashtags

### Requirement: Command Documentation
The system SHALL document all task management commands in RULEBOOK.md with complete specifications.

#### Scenario: Document task create command
Given RULEBOOK.md exists
When documentation is updated
Then it SHALL include complete specification for `rulebook task create <task-id>` command

#### Scenario: Document task list command
Given RULEBOOK.md exists
When documentation is updated
Then it SHALL include complete specification for `rulebook task list [--archived]` command

#### Scenario: Document task show command
Given RULEBOOK.md exists
When documentation is updated
Then it SHALL include complete specification for `rulebook task show <task-id>` command

#### Scenario: Document task validate command
Given RULEBOOK.md exists
When documentation is updated
Then it SHALL include complete specification for `rulebook task validate <task-id>` command

#### Scenario: Document task archive command
Given RULEBOOK.md exists
When documentation is updated
Then it SHALL include complete specification for `rulebook task archive <task-id> [--skip-validation]` command

