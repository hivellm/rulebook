## ADDED Requirements

### Requirement: Configuration Management
The system SHALL provide a centralized configuration manager for .rulebook files with CRUD operations, feature toggles, and project-specific settings.

#### Scenario: Create new configuration
- **WHEN** a user runs `rulebook config init`
- **THEN** a .rulebook file is created with default settings
- **AND** feature toggles are enabled/disabled based on project type

#### Scenario: Update configuration
- **WHEN** a user modifies configuration settings
- **THEN** changes are validated and persisted
- **AND** dependent features are updated accordingly

### Requirement: OpenSpec Integration
The system SHALL integrate with OpenSpec workflow for task management, dependency tracking, and validation.

#### Scenario: Load OpenSpec tasks
- **WHEN** OpenSpec directory exists
- **THEN** tasks are loaded from markdown files
- **AND** dependencies are validated for circular references

#### Scenario: Task dependency validation
- **WHEN** tasks have dependencies
- **THEN** circular dependencies are detected and reported
- **AND** task execution order is calculated

### Requirement: Persistent Logging
The system SHALL provide comprehensive logging with rotation, structured JSON format, and automatic cleanup.

#### Scenario: Log task execution
- **WHEN** tasks are executed
- **THEN** detailed logs are written to openspec/logs/
- **AND** logs include timestamps, status, and error details

#### Scenario: Log rotation
- **WHEN** log files exceed size limits
- **THEN** old logs are archived
- **AND** new log files are created

## MODIFIED Requirements

### Requirement: Modern Console Interface
The system SHALL provide a modern full-screen console interface using blessed library instead of basic ANSI output.

#### Scenario: Start modern watcher
- **WHEN** user runs `rulebook watcher`
- **THEN** full-screen interface is displayed
- **AND** multiple panels show tasks, logs, and system info

#### Scenario: Interactive navigation
- **WHEN** user presses keyboard shortcuts
- **THEN** interface responds with appropriate actions
- **AND** navigation between panels is smooth
