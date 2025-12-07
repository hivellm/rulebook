# Core Skills Architecture Specification

## ADDED Requirements

### Requirement: Skills-Based Modular Architecture
The system SHALL organize capabilities into self-contained skills, where each skill is a folder containing SKILL.md with YAML frontmatter and guidance content.

#### Scenario: Skill structure
Given a skill named "typescript-quality"
When the skill is created
Then it SHALL be located in `/rulebook/skills/languages/typescript-quality/`
And it SHALL contain a `SKILL.md` file with YAML frontmatter (name, description)
And it SHALL contain guidance content following the SKILL.md format
And it MAY contain supporting files (scripts, templates, examples)

#### Scenario: Skills organization
Given multiple skills exist
When skills are organized
Then they SHALL be grouped by category: `languages/`, `frameworks/`, `modules/`, `workflows/`, `ides/`, `services/`
And each category SHALL contain relevant skills as subdirectories
And the system SHALL maintain a skills index for discovery

### Requirement: Skills Manager Module
The system SHALL provide a skills manager module that handles discovery, loading, merging, and management of skills.

#### Scenario: Discover available skills
Given the skills manager is initialized
When it discovers skills
Then it SHALL scan `/rulebook/skills/` directory structure
And it SHALL read SKILL.md files to extract metadata
And it SHALL build an index of all available skills with their descriptions
And it SHALL return the skills list organized by category

#### Scenario: Load enabled skills
Given a project configuration with enabled skills
When the skills manager loads skills
Then it SHALL read each enabled skill's SKILL.md file
And it SHALL extract the guidance content
And it SHALL merge all skill contents into AGENTS.md
And it SHALL preserve the order specified in configuration
And it SHALL handle missing or invalid skills gracefully

#### Scenario: Enable a skill
Given a skill exists and is not enabled
When the user enables the skill
Then the system SHALL add it to the project configuration
And the system SHALL update AGENTS.md to include the skill's instructions
And the system SHALL validate that the skill doesn't conflict with existing configuration

#### Scenario: Disable a skill
Given a skill is enabled in the project
When the user disables the skill
Then the system SHALL remove it from the project configuration
And the system SHALL remove the skill's instructions from AGENTS.md
And the system SHALL preserve all other skills and customizations

### Requirement: Backward Compatibility
The system SHALL maintain full backward compatibility with existing Rulebook v1.x projects, automatically migrating to skills-based architecture.

#### Scenario: Migrate existing project
Given an existing project with Rulebook v1.x configuration
When the system loads the project
Then it SHALL detect the old format
And it SHALL automatically convert existing rules into skills format
And it SHALL preserve all existing directives and rules
And it SHALL maintain the same AGENTS.md output
And it SHALL update the configuration to use skills architecture

#### Scenario: Load legacy configuration
Given a project with legacy .rulebook configuration
When the system reads the configuration
Then it SHALL parse the legacy format
And it SHALL map legacy settings to skills-based configuration
And it SHALL enable all skills that correspond to legacy settings
And it SHALL preserve customizations

### Requirement: Skills Configuration
The system SHALL store skills configuration in the project's .rulebook file, tracking enabled/disabled skills and their order.

#### Scenario: Save skills configuration
Given skills are enabled or disabled
When the configuration is saved
Then it SHALL update the .rulebook file with skills configuration
And it SHALL store the list of enabled skills
And it SHALL store the order of skills for merging
And it SHALL preserve all other configuration settings

#### Scenario: Load skills configuration
Given a .rulebook file with skills configuration
When the system loads the configuration
Then it SHALL read the enabled skills list
And it SHALL read the skills order
And it SHALL validate that all referenced skills exist
And it SHALL handle missing skills gracefully (log warning, skip)

### Requirement: AGENTS.md Generation with Skills
The system SHALL generate AGENTS.md by merging all enabled skills' instructions, maintaining clear structure and explicit capability documentation.

#### Scenario: Generate AGENTS.md from skills
Given multiple skills are enabled
When AGENTS.md is generated
Then it SHALL include a skills index section listing all enabled skills
And it SHALL include a capabilities summary explaining what's available
And it SHALL merge each skill's SKILL.md content in the configured order
And it SHALL maintain clear section boundaries between skills
And it SHALL preserve custom user additions

#### Scenario: Skills index section
Given AGENTS.md is generated
When the skills index section is created
Then it SHALL list each enabled skill with its name and description
And it SHALL organize skills by category
And it SHALL provide clear links or references to skill documentation
And it SHALL make it easy for LLMs to understand available capabilities

## MODIFIED Requirements

### Requirement: Generator Module
The system SHALL modify the generator module to support skills-based architecture while maintaining backward compatibility.

#### Scenario: Generate with skills
Given the generator is called with skills configuration
When it generates AGENTS.md
Then it SHALL use the skills manager to load enabled skills
And it SHALL merge skills content instead of using monolithic templates
And it SHALL preserve all existing generation features
And it SHALL maintain the same output format for compatibility

