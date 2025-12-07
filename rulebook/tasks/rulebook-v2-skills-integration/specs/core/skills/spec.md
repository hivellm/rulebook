# Skills System Specification

## ADDED Requirements

### Requirement: Skill File Format
The system SHALL define a standard format for skill files (SKILL.md) that includes YAML frontmatter and guidance content compatible with Hugging Face Skills and Claude Code.

#### Scenario: Valid skill file structure
Given a skill file is created
When it follows the SKILL.md format
Then it SHALL start with YAML frontmatter containing: name (required), description (required), version (optional), category (optional)
And it SHALL be followed by markdown content with guidance and instructions
And it SHALL be compatible with Hugging Face Skills format
And it SHALL be compatible with Claude Code plugin format

#### Scenario: Skill metadata extraction
Given a SKILL.md file exists
When the system reads the skill
Then it SHALL parse the YAML frontmatter
And it SHALL extract name, description, and optional fields
And it SHALL validate that required fields are present
And it SHALL handle missing or invalid YAML gracefully

### Requirement: Skills Directory Structure
The system SHALL organize skills in a hierarchical directory structure by category for easy discovery and management.

#### Scenario: Skills directory organization
Given skills are organized
When the directory structure is created
Then skills SHALL be located in `/rulebook/skills/` directory
And skills SHALL be grouped by category: `languages/`, `frameworks/`, `modules/`, `workflows/`, `ides/`, `services/`
And each skill SHALL be in its own subdirectory named after the skill
And the system SHALL support nested categories if needed

#### Scenario: Skill discovery
Given skills exist in the directory structure
When the system discovers skills
Then it SHALL recursively scan `/rulebook/skills/` directory
And it SHALL identify all directories containing SKILL.md files
And it SHALL read and parse each SKILL.md file
And it SHALL build a complete index of available skills
And it SHALL organize the index by category

### Requirement: Skills Compatibility with AI CLI Tools
The system SHALL ensure skills are compatible with major AI CLI tools including Claude Code, Codex, and Gemini CLI.

#### Scenario: Claude Code compatibility
Given a skill is created
When it is used with Claude Code
Then it SHALL be compatible with Claude's plugin system
And it SHALL work with `.claude-plugin` configuration
And it SHALL be discoverable through Claude's marketplace
And it SHALL follow Claude Code's skill format requirements

#### Scenario: Codex compatibility
Given a skill is created
When it is used with Codex
Then it SHALL be compatible with Codex's AGENTS.md format
And it SHALL be readable by Codex's instruction system
And it SHALL follow Codex's documentation standards

#### Scenario: Gemini CLI compatibility
Given a skill is created
When it is used with Gemini CLI
Then it SHALL be compatible with Gemini's extension format
And it SHALL work with `gemini-extension.json` configuration
And it SHALL follow Gemini CLI's extension requirements

### Requirement: Skills Merging
The system SHALL merge multiple enabled skills into a single AGENTS.md file, maintaining clear structure and avoiding conflicts.

#### Scenario: Merge multiple skills
Given multiple skills are enabled
When AGENTS.md is generated
Then the system SHALL merge each skill's content in the configured order
And it SHALL add clear section headers for each skill
And it SHALL preserve the original formatting of each skill
And it SHALL handle duplicate section names by prefixing with skill name
And it SHALL maintain a skills index at the top of AGENTS.md

#### Scenario: Handle skill conflicts
Given two skills have conflicting instructions
When skills are merged
Then the system SHALL detect the conflict during validation
And it SHALL warn the user about the conflict
And it SHALL allow the user to choose which skill takes precedence
And it SHALL document the conflict resolution in configuration

### Requirement: Skills Templates
The system SHALL provide skill templates that can be used to create new skills following the standard format.

#### Scenario: Create skill from template
Given a user wants to create a new skill
When they use the skill template
Then the system SHALL provide a template SKILL.md file with YAML frontmatter
And it SHALL include placeholder content for guidance
And it SHALL include examples of proper formatting
And it SHALL be located in the appropriate category directory

#### Scenario: Skill template structure
Given a skill template exists
When it is used
Then it SHALL include required YAML fields with comments
And it SHALL include example markdown content
And it SHALL include instructions on how to fill the template
And it SHALL follow the same format as existing skills

