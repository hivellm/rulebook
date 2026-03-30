## ADDED Requirements

### Requirement: Modern Watcher Command
The system SHALL provide a modern full-screen watcher command that replaces the basic ANSI interface.

#### Scenario: Start modern watcher
- **WHEN** user runs `rulebook watcher`
- **THEN** full-screen blessed interface is displayed
- **AND** classic ANSI interface is not available

#### Scenario: Display task information
- **WHEN** watcher is running
- **THEN** OpenSpec tasks are displayed in real-time
- **AND** task status, progress, and details are shown

#### Scenario: System monitoring
- **WHEN** watcher is active
- **THEN** CPU and memory usage are displayed
- **AND** system health metrics are updated regularly

### Requirement: Agent Command
The system SHALL provide an agent command for autonomous task management.

#### Scenario: Start agent
- **WHEN** user runs `rulebook agent`
- **THEN** available CLI tools are detected and listed
- **AND** user can select which tool to use

#### Scenario: Agent workflow execution
- **WHEN** agent is running
- **THEN** tasks are executed automatically
- **AND** quality gates are enforced between steps

### Requirement: Configuration Commands
The system SHALL provide commands for managing .rulebook configuration.

#### Scenario: Initialize configuration
- **WHEN** user runs `rulebook config init`
- **THEN** .rulebook file is created with defaults
- **AND** project-specific settings are configured

#### Scenario: Show configuration
- **WHEN** user runs `rulebook config show`
- **THEN** current configuration is displayed
- **AND** feature toggles and settings are shown

## REMOVED Requirements

### Requirement: Classic ANSI Watcher
**Reason**: Replaced by modern blessed interface for better functionality
**Migration**: Users should use `rulebook watcher` for the new interface
