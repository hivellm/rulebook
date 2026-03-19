# Spec Delta: Knowledge Manager

## ADDED Requirements

### Requirement: Knowledge Storage
The system SHALL store knowledge entries as Markdown files with `.metadata.json` sidecars in `.rulebook/knowledge/patterns/` and `.rulebook/knowledge/anti-patterns/` directories based on entry type.

#### Scenario: Add a pattern
Given no patterns exist
When the user adds a pattern with title "Repository Pattern" and category "architecture"
Then `repository-pattern.md` and `repository-pattern.metadata.json` are created in `.rulebook/knowledge/patterns/`

#### Scenario: Add an anti-pattern
Given no anti-patterns exist
When the user adds an anti-pattern with title "God Object" and category "code"
Then `god-object.md` and `god-object.metadata.json` are created in `.rulebook/knowledge/anti-patterns/`

### Requirement: Knowledge Entry Format
Each knowledge entry SHALL contain sections: Description, Example (optional code block), When to Use, and When NOT to Use. The metadata MUST contain `id`, `type`, `title`, `category`, `createdAt`, `tags`, and `source` fields.

#### Scenario: Show knowledge entry
Given pattern "repository-pattern" exists
When the user shows "repository-pattern"
Then the full Markdown content with all sections is returned

### Requirement: Knowledge Filtering
The `list` operation SHALL support filtering by `type` (pattern/anti-pattern) and `category` (architecture/code/testing/security/performance/devops).

#### Scenario: List patterns by category
Given 5 patterns and 3 anti-patterns exist across categories
When the user lists with type "pattern" and category "architecture"
Then only architecture patterns are returned

### Requirement: Knowledge Removal
The `remove` operation SHALL delete both the Markdown file and its metadata sidecar.

#### Scenario: Remove a knowledge entry
Given pattern "repository-pattern" exists
When the user removes "repository-pattern"
Then both files are deleted from `.rulebook/knowledge/patterns/`

### Requirement: Knowledge Generator Integration
The generator SHALL inject a "Project Knowledge" section into AGENTS.md with subsections for patterns and anti-patterns, listing titles with links to their files. This section MUST be regenerated on every `rulebook update`.

#### Scenario: AGENTS.md includes knowledge
Given 2 patterns and 1 anti-pattern exist
When `rulebook update` runs
Then AGENTS.md contains a "Project Knowledge" section with 2 pattern links and 1 anti-pattern link

### Requirement: Knowledge MCP Tools
The MCP server SHALL expose `rulebook_knowledge_add`, `rulebook_knowledge_list`, and `rulebook_knowledge_show` tools. All tools MUST accept optional `projectId` for workspace routing.

#### Scenario: Add knowledge via MCP
Given the MCP server is running
When a client calls `rulebook_knowledge_add` with type "pattern" and title "Error Boundary"
Then a new knowledge entry is created and returned with success=true
