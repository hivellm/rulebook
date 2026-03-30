# Spec Delta: Migrate `rulebook/` to `.rulebook/`

## MODIFIED Requirements

### Requirement: Directory Structure Consolidation
The system SHALL store all rulebook-managed data under a single `.rulebook/` hidden directory at the project root, instead of splitting between `rulebook/` and `.rulebook/`.

#### Scenario: New project initialization
Given a new project without any rulebook configuration
When the user runs `rulebook init`
Then the system SHALL create `.rulebook/` with subdirectories: `specs/`, `tasks/`, `memory/`, `ralph/`
And the system SHALL NOT create a visible `rulebook/` directory

#### Scenario: Existing project with old structure
Given a project with a `rulebook/specs/` and/or `rulebook/tasks/` directory
When the user runs `rulebook init` or `rulebook update`
Then the system SHALL copy all files from `rulebook/specs/` to `.rulebook/specs/`
And the system SHALL copy all files from `rulebook/tasks/` to `.rulebook/tasks/`
And the system SHALL remove the empty `rulebook/` directory after successful migration
And the system SHALL NOT overwrite existing files in `.rulebook/specs/` or `.rulebook/tasks/`

#### Scenario: Already migrated project
Given a project where `.rulebook/specs/` already contains files and no `rulebook/` directory exists
When the user runs `rulebook init` or `rulebook update`
Then the system SHALL skip migration and proceed normally

### Requirement: Path References in AGENTS.md
The generator SHALL output spec file references using `/.rulebook/specs/` path prefix instead of `/rulebook/specs/`.

#### Scenario: Generated AGENTS.md references
Given a project with TypeScript and Rust detected
When the generator creates AGENTS.md
Then the file SHALL contain references like `/.rulebook/specs/TYPESCRIPT.md` and `/.rulebook/specs/RUST.md`
And the file SHALL NOT contain any `/rulebook/specs/` references (without the dot prefix)

### Requirement: Default Configuration Paths
All components SHALL use `.rulebook` as the default `rulebookDir` value instead of `rulebook`.

#### Scenario: Task manager default path
Given a TaskManager created without explicit rulebookDir
When it resolves task paths
Then it SHALL use `.rulebook/tasks/` as the base directory

#### Scenario: MCP server default paths
Given an MCP server loading configuration
When tasksDir is not specified in config
Then it SHALL default to `.rulebook/tasks`
And archiveDir SHALL default to `.rulebook/archive`

### Requirement: Non-Destructive Migration
The migration process SHALL be non-destructive and idempotent.

#### Scenario: Migration with existing destination files
Given `.rulebook/specs/TYPESCRIPT.md` already exists
And `rulebook/specs/TYPESCRIPT.md` also exists
When migration runs
Then the system SHALL keep the existing `.rulebook/specs/TYPESCRIPT.md`
And the system SHALL NOT overwrite it with the old version

#### Scenario: Repeated migration attempts
Given migration has already completed successfully
When `rulebook update` is run again
Then the system SHALL detect no `rulebook/` directory exists
And the system SHALL skip migration silently
