## MODIFIED Requirements

### Requirement: AGENTS.md Generation
The system SHALL generate AGENTS.md files with modular directive references instead of embedding all templates.

#### Scenario: Generate AGENTS.md with references
- **WHEN** running `rulebook init` or `rulebook update`
- **THEN** AGENTS.md contains core rulebook rules and references to modular directives
- **AND** detailed language/framework/module rules are written to `/rulebook/[NAME].md` files
- **AND** AGENTS.md includes clear usage instructions for accessing each module

#### Scenario: Reference format in AGENTS.md
- **WHEN** AGENTS.md is generated with language TypeScript
- **THEN** AGENTS.md includes a section like:
  ```markdown
  ## TypeScript Rules
  
  For detailed TypeScript-specific rules, see `/rulebook/TYPESCRIPT.md`
  
  Key areas covered:
  - Type safety and strict mode
  - Code quality standards
  - Testing requirements
  - Package management
  ```
- **AND** the actual TypeScript rules are in `/rulebook/TYPESCRIPT.md`

#### Scenario: Modular file generation
- **WHEN** generating project with TypeScript and React
- **THEN** `/rulebook/TYPESCRIPT.md` is created with full TypeScript rules
- **AND** `/rulebook/REACT.md` is created with full React rules
- **AND** AGENTS.md contains references to both files
- **AND** core rules remain embedded in AGENTS.md

### Requirement: Modular Directive Files
The system SHALL create standalone directive files in `/rulebook/` directory.

#### Scenario: Language directive file
- **WHEN** project includes a language (e.g., TypeScript)
- **THEN** `/rulebook/TYPESCRIPT.md` is created
- **AND** file contains complete language-specific rules
- **AND** file includes header comment with usage instructions
- **AND** file includes footer comment marking end

#### Scenario: Module directive file
- **WHEN** project includes a module (e.g., OpenSpec)
- **THEN** `/rulebook/OPENSPEC.md` is created
- **AND** file contains complete module-specific rules
- **AND** file is formatted consistently with other directive files

#### Scenario: Framework directive file
- **WHEN** project includes a framework (e.g., React)
- **THEN** `/rulebook/REACT.md` is created
- **AND** file contains complete framework-specific rules

### Requirement: Migration Support
The system SHALL provide migration path for existing projects with embedded templates.

#### Scenario: Migrate embedded templates
- **WHEN** running `rulebook update` on project with embedded templates in AGENTS.md
- **THEN** system detects embedded templates
- **AND** extracts templates to `/rulebook/[NAME].md` files
- **AND** replaces embedded content with references
- **AND** preserves custom content in AGENTS.md

#### Scenario: Handle existing rulebook directory
- **WHEN** `/rulebook/` directory already exists
- **THEN** system checks for conflicts
- **AND** prompts user for overwrite if conflicts detected
- **AND** preserves existing files when no conflicts

### Requirement: Core Rules in AGENTS.md
The system SHALL keep essential core rules embedded in AGENTS.md.

#### Scenario: Core rules remain embedded
- **WHEN** generating AGENTS.md
- **THEN** RULEBOOK header and core rules remain embedded
- **AND** QUALITY_ENFORCEMENT rules remain embedded (if not in light mode)
- **AND** Documentation Standards remain embedded
- **AND** Git workflow rules remain embedded (if enabled)

## ADDED Requirements

### Requirement: Reference Format Standard
The system SHALL use a consistent format for directive references in AGENTS.md.

#### Scenario: Standard reference format
- **WHEN** AGENTS.md includes reference to `/rulebook/TYPESCRIPT.md`
- **THEN** format follows pattern:
  ```markdown
  ## TypeScript Development Rules
  
  For comprehensive TypeScript-specific guidelines, see `/rulebook/TYPESCRIPT.md`
  
  Quick reference:
  - Type safety requirements
  - Code quality standards  
  - Testing requirements (95%+ coverage)
  - Package management
  ```
- **AND** includes clear usage context

#### Scenario: Cross-references
- **WHEN** multiple related modules are present
- **THEN** references include cross-links
- **AND** example: "See also `/rulebook/OPENSPEC.md` for spec-driven development"

