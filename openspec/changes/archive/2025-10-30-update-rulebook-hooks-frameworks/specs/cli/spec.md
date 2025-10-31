## ADDED Requirements

### Requirement: Optional Git Hook Installation
The CLI SHALL offer optional Git hook installation during `init` and `update` commands only when hooks do not already exist.

#### Scenario: Hooks not present during init
- **WHEN** user runs `rulebook init` and `.git/hooks/pre-commit` does not exist
- **THEN** system prompts "Install Git hooks for automated quality checks? (pre-commit, pre-push)"
- **AND** if user confirms, system generates language-aware hook scripts
- **AND** marks `gitHooks: true` in `.rulebook` config

#### Scenario: Hooks already present
- **WHEN** user runs `rulebook init` and `.git/hooks/pre-commit` exists
- **THEN** system skips hook installation prompt
- **AND** logs "Git hooks already installed, skipping"

#### Scenario: User declines hook installation
- **WHEN** user runs `rulebook init` and declines hook prompt
- **THEN** system proceeds without installing hooks
- **AND** marks `gitHooks: false` in `.rulebook` config
- **AND** documents manual installation commands in output

### Requirement: Language-Aware Hook Generation
The system SHALL generate hook scripts that execute appropriate quality commands based on detected project language.

#### Scenario: TypeScript project hooks
- **WHEN** system generates hooks for TypeScript project
- **THEN** `pre-commit` script includes `npm run lint && npm run type-check && npm test`
- **AND** `pre-push` script includes `npm run build && npm run test:coverage`

#### Scenario: Rust project hooks
- **WHEN** system generates hooks for Rust project
- **THEN** `pre-commit` script includes `cargo fmt --check && cargo clippy -- -D warnings && cargo test`
- **AND** `pre-push` script includes `cargo build --release`

#### Scenario: Python project hooks
- **WHEN** system generates hooks for Python project
- **THEN** `pre-commit` script includes `black --check . && ruff check . && pytest`
- **AND** `pre-push` script includes `pytest --cov`

### Requirement: Framework Detection
The CLI SHALL detect common backend and frontend frameworks from project dependencies and file patterns.

#### Scenario: NestJS detection
- **WHEN** `package.json` contains `@nestjs/core` dependency
- **THEN** system identifies framework as "nestjs"
- **AND** includes NestJS-specific instructions in AGENTS.md

#### Scenario: React detection
- **WHEN** `package.json` contains `react` dependency
- **THEN** system identifies framework as "react"
- **AND** includes React-specific best practices in templates

#### Scenario: Spring Boot detection
- **WHEN** `pom.xml` contains `spring-boot-starter` dependency
- **THEN** system identifies framework as "spring"
- **AND** includes Spring Boot quality gate commands

#### Scenario: Laravel detection
- **WHEN** `composer.json` contains `laravel/framework` dependency
- **THEN** system identifies framework as "laravel"
- **AND** includes Laravel-specific testing commands

### Requirement: Minimal Mode
The CLI SHALL provide a `--minimal` or `--essentials` mode that scaffolds only essential files while skipping advanced features.

#### Scenario: Minimal mode init
- **WHEN** user runs `rulebook init --minimal`
- **THEN** system generates only README.md, LICENSE, basic tests directory, and minimal CI workflow
- **AND** skips OpenSpec, Watcher, MCP modules, and agent automation templates
- **AND** marks `mode: minimal` in `.rulebook` config

#### Scenario: Full mode init (default)
- **WHEN** user runs `rulebook init` without `--minimal` flag
- **THEN** system generates complete rulebook structure including all templates and modules
- **AND** marks `mode: full` in `.rulebook` config

#### Scenario: Minimal mode during prompts
- **WHEN** user runs `rulebook init` in interactive mode
- **THEN** system prompts "Setup mode: [Minimal - essentials only] or [Full - complete setup]?"
- **AND** applies corresponding template set based on user choice

## MODIFIED Requirements

### Requirement: README Generation
The system SHALL generate concise README.md in project root with extended documentation relocated to `/docs` directory.

#### Scenario: Concise root README
- **WHEN** system generates README.md
- **THEN** root README contains only project overview, quick start, and installation
- **AND** extended sections (architecture, development guide, roadmap) link to `/docs/ARCHITECTURE.md`, `/docs/DEVELOPMENT.md`, `/docs/ROADMAP.md`

#### Scenario: Detailed docs directory
- **WHEN** system generates documentation
- **THEN** `/docs` directory contains ARCHITECTURE.md, DEVELOPMENT.md, ROADMAP.md, and feature specs
- **AND** root README links to these detailed docs

## REMOVED Requirements

### Requirement: Duplicate Git Hook Instructions
**Reason**: Hook instructions were duplicated across `AGENTS.md` and `templates/git/GIT_WORKFLOW.md` causing maintenance overhead

**Migration**: Consolidated into single authoritative section in `templates/git/GIT_WORKFLOW.md` with optional automated installation via CLI

