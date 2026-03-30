# Core Directory Reorganization Specification

## MODIFIED Requirements

### Requirement: Modular File Output Path
The generator SHALL write modular spec/rule files to `/${rulebookDir}/specs/` instead of `/${rulebookDir}/` root.

#### Scenario: Generate modular files to specs directory
Given the generator is creating modular rulebook files
When `writeModularFile()` is called with fileName "TYPESCRIPT"
Then it SHALL write to `/${rulebookDir}/specs/TYPESCRIPT.md`
And it SHALL NOT write to `/${rulebookDir}/TYPESCRIPT.md`
And it SHALL create the `specs/` directory if it does not exist

#### Scenario: Generate AGENTS.md references
Given AGENTS.md is being generated with modular references
When the reference section is created
Then all file references SHALL use `/${rulebookDir}/specs/FILE.md` path pattern
And the references SHALL be valid relative paths from the project root

### Requirement: Migration from Flat to Specs Layout
The migrator SHALL detect and migrate existing flat-layout rulebook directories to the new specs/ structure.

#### Scenario: Detect flat layout
Given a project has `TYPESCRIPT.md` in the root of the rulebook directory (flat layout)
When `rulebook update` is run
Then it SHALL detect that markdown files exist directly in `/${rulebookDir}/` root
And it SHALL identify these as candidates for migration to `/${rulebookDir}/specs/`

#### Scenario: Migrate flat to specs layout
Given markdown files exist in `/${rulebookDir}/` root (flat layout)
When migration runs
Then it SHALL create `/${rulebookDir}/specs/` directory
And it SHALL move all `.md` files (except those in `tasks/` and `archive/`) to `/${rulebookDir}/specs/`
And it SHALL preserve file contents unchanged
And it SHALL NOT move the `tasks/` directory or its contents
And it SHALL regenerate AGENTS.md with updated reference paths

#### Scenario: Already migrated
Given markdown files already exist in `/${rulebookDir}/specs/`
When migration runs
Then it SHALL detect the specs/ layout already exists
And it SHALL NOT duplicate or overwrite existing files
