## Current Core Functionality

### Requirement: Basic Rule Generation
The system SHALL generate project rules from templates based on detected technology stack.

#### Scenario: Detect project type
- **WHEN** rulebook is run in a project directory
- **THEN** project type and technologies are detected
- **AND** appropriate rule templates are selected

#### Scenario: Generate rule files
- **WHEN** templates are selected
- **THEN** rule files are generated in project root
- **AND** rules are customized for the specific project

### Requirement: Template Management
The system SHALL provide language and framework-specific rule templates.

#### Scenario: List available templates
- **WHEN** user runs `rulebook list`
- **THEN** available templates are displayed
- **AND** descriptions and categories are shown

#### Scenario: Apply template
- **WHEN** user selects a template
- **THEN** template is applied to project
- **AND** existing rules are merged or replaced

### Requirement: Validation
The system SHALL validate generated rules and project structure.

#### Scenario: Validate rules
- **WHEN** rules are generated
- **THEN** syntax and structure are validated
- **AND** errors are reported with suggestions

#### Scenario: Check project health
- **WHEN** health check is requested
- **THEN** project structure is analyzed
- **AND** health score is calculated
