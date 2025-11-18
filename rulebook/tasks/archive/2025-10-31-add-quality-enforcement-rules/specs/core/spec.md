## ADDED Requirements

### Requirement: Quality Enforcement Rules
The system SHALL include strict anti-bypass rules to prevent AI models from circumventing quality gates.

#### Scenario: Test bypassing prohibition
- **WHEN** AI model generates code
- **THEN** it SHALL NOT use .skip(), .only(), or .todo() to bypass failing tests
- **AND** it SHALL NOT comment out failing tests
- **AND** it SHALL NOT use @ts-ignore or similar to hide test errors
- **AND** it SHALL fix the actual problem causing test failures

#### Scenario: Git hook bypassing prohibition
- **WHEN** AI model performs git operations
- **THEN** it SHALL NOT use --no-verify flag on git commit
- **AND** it SHALL NOT use --no-verify flag on git push
- **AND** it SHALL NOT disable or skip pre-commit hooks
- **AND** it SHALL NOT disable or skip pre-push hooks
- **AND** it SHALL fix the issues that hooks are detecting

#### Scenario: Test implementation quality
- **WHEN** AI model writes tests
- **THEN** it SHALL NOT create boilerplate tests without real assertions
- **AND** it SHALL NOT write tests that always pass regardless of implementation
- **AND** it SHALL NOT mock everything to avoid testing real behavior
- **AND** it SHALL write meaningful tests that verify actual functionality

#### Scenario: Problem solving approach
- **WHEN** AI model encounters issues
- **THEN** it SHALL NOT seek the simplest bypass or workaround
- **AND** it SHALL NOT be creative with shortcuts that compromise quality
- **AND** it SHALL solve problems properly following best practices
- **AND** it SHALL use proven, established solutions from decades of experience
- **AND** it SHALL fix root causes, not symptoms

### Requirement: Light Mode Configuration
The system SHALL provide a light mode option that skips quality enforcement for quick prototypes.

#### Scenario: Light mode activation via init
- **WHEN** user runs `rulebook init --light`
- **THEN** quality enforcement rules SHALL NOT be injected into AGENTS.md
- **AND** testing requirements SHALL be skipped
- **AND** linting requirements SHALL be skipped
- **AND** coverage requirements SHALL be skipped

#### Scenario: Light mode activation via update
- **WHEN** user runs `rulebook update --light`
- **THEN** existing AGENTS.md SHALL NOT be updated with quality enforcement rules
- **AND** lightMode property SHALL be saved in .rulebook configuration

#### Scenario: Light mode persistence
- **WHEN** project has lightMode configured in .rulebook
- **THEN** subsequent updates SHALL maintain light mode
- **UNLESS** --light flag is explicitly provided with opposite value

### Requirement: Quality Rules Injection
The system SHALL automatically inject quality enforcement rules into all generated AGENTS.md files.

#### Scenario: Default injection on init
- **WHEN** user runs `rulebook init` without --light flag
- **THEN** QUALITY_ENFORCEMENT.md template SHALL be injected into AGENTS.md
- **AND** injection SHALL occur after header timestamp
- **AND** injection SHALL occur before other sections

#### Scenario: Injection on update
- **WHEN** user runs `rulebook update` without --light flag
- **THEN** QUALITY_ENFORCEMENT.md template SHALL be added to existing AGENTS.md
- **AND** existing custom blocks SHALL be preserved
- **AND** quality rules SHALL be merged properly

#### Scenario: Skip injection in light mode
- **WHEN** user runs init or update with --light flag
- **THEN** quality enforcement rules SHALL NOT be injected
- **AND** lightMode property SHALL be set to true in configuration

