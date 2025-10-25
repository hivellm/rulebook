## Current CLI Functionality

### Requirement: Basic CLI Commands
The system SHALL provide basic CLI commands for rule generation and project management.

#### Scenario: Generate rules
- **WHEN** user runs `rulebook generate`
- **THEN** rules are generated based on project detection
- **AND** output files are created in project root

#### Scenario: List templates
- **WHEN** user runs `rulebook list`
- **THEN** available templates are displayed
- **AND** user can select templates to apply

#### Scenario: Validate project
- **WHEN** user runs `rulebook validate`
- **THEN** project structure and rules are validated
- **AND** health score is calculated and displayed

#### Scenario: Show help
- **WHEN** user runs `rulebook --help`
- **THEN** available commands and options are displayed
- **AND** usage examples are provided

### Requirement: Project Detection
The system SHALL automatically detect project type and technology stack.

#### Scenario: Detect TypeScript project
- **WHEN** package.json with TypeScript is found
- **THEN** TypeScript rules are applied
- **AND** ESLint and Prettier configurations are included

#### Scenario: Detect Python project
- **WHEN** requirements.txt or pyproject.toml is found
- **THEN** Python rules are applied
- **AND** linting and formatting tools are configured
