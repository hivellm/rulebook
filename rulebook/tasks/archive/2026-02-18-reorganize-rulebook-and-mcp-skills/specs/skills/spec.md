# MCP Tool Skills Specification

## ADDED Requirements

### Requirement: Individual MCP Tool Skills
The project SHALL provide a dedicated Claude Code skill for each MCP tool, following the SKILL.md format with YAML frontmatter.

#### Scenario: Skill file structure
Given a MCP tool `rulebook_task_create`
When its skill is created
Then it SHALL be located at `skills/rulebook-task-create/SKILL.md`
And it SHALL contain YAML frontmatter with name, description, version, category, author, tags, dependencies, conflicts
And it SHALL contain the tool's purpose, input schema with all parameters, usage examples, expected output format, and error handling

#### Scenario: Skill content format
Given any MCP tool skill
When the SKILL.md is read by an AI agent
Then it SHALL clearly describe when to use this specific tool
And it SHALL list all input parameters with types, defaults, and whether required/optional
And it SHALL provide at least 2 usage examples with expected responses
And it SHALL document error responses and how to handle them
And the category SHALL be "mcp"
And the tags SHALL include the tool name and "mcp"

### Requirement: Task Management Tool Skills
The project SHALL provide individual skills for all 7 task management MCP tools.

#### Scenario: All task tools have skills
Given the MCP server exposes task management tools
When skills are listed in the `skills/` directory
Then there SHALL exist skills for: rulebook-task-create, rulebook-task-list, rulebook-task-show, rulebook-task-update, rulebook-task-validate, rulebook-task-archive, rulebook-task-delete
And each skill SHALL document the tool's specific input schema and behavior

### Requirement: Skill Management Tool Skills
The project SHALL provide individual skills for all 6 skill management MCP tools.

#### Scenario: All skill tools have skills
Given the MCP server exposes skill management tools
When skills are listed in the `skills/` directory
Then there SHALL exist skills for: rulebook-skill-list, rulebook-skill-show, rulebook-skill-enable, rulebook-skill-disable, rulebook-skill-search, rulebook-skill-validate
And each skill SHALL document the tool's specific input schema and behavior

### Requirement: Updated MCP Overview Skill
The existing `rulebook-mcp` skill SHALL be updated to serve as an overview/index referencing individual tool skills.

#### Scenario: MCP overview references individual skills
Given the `skills/rulebook-mcp/SKILL.md` is read
When an AI agent needs to understand MCP capabilities
Then it SHALL provide a high-level overview of the MCP server
And it SHALL reference individual tool skills by name for detailed usage
And it SHALL NOT duplicate the full documentation already in individual skills
