# Spec Delta: Decision Manager

## ADDED Requirements

### Requirement: Decision Storage
The system SHALL store decisions as numbered Markdown files in `.rulebook/decisions/NNN-<slug>.md` with a companion `.metadata.json` sidecar file.

#### Scenario: Create first decision
Given no decisions exist
When the user creates a decision with title "Use PostgreSQL"
Then the system creates `001-use-postgres.md` and `001-use-postgres.metadata.json`

#### Scenario: Auto-increment numbering
Given decisions 001 through 005 exist
When the user creates a new decision
Then the system assigns ID 006

### Requirement: Decision Lifecycle
The system SHALL support four statuses: `proposed`, `accepted`, `superseded`, `deprecated`. The `supersede` operation MUST mark the old decision as `superseded` and record the superseding decision ID.

#### Scenario: Supersede a decision
Given decision 001 exists with status "accepted"
When the user supersedes decision 001 with decision 005
Then decision 001 status becomes "superseded" with supersededBy=5

#### Scenario: List by status
Given decisions with mixed statuses exist
When the user lists decisions with status filter "accepted"
Then only decisions with status "accepted" are returned

### Requirement: Decision File Format
Each decision file SHALL contain sections: Context, Decision, Alternatives Considered, and Consequences. The metadata sidecar MUST contain `id`, `slug`, `title`, `status`, `date`, `relatedTasks`, and `supersededBy` fields.

#### Scenario: Show full decision
Given decision 003 exists
When the user shows decision 3
Then the full Markdown content and metadata are returned

### Requirement: Decision MCP Tools
The MCP server SHALL expose `rulebook_decision_create`, `rulebook_decision_list`, `rulebook_decision_show`, and `rulebook_decision_update` tools. All tools MUST accept optional `projectId` for workspace routing.

#### Scenario: Create decision via MCP
Given the MCP server is running
When a client calls `rulebook_decision_create` with title "Use REST API"
Then a new decision is created and returned with success=true

### Requirement: Decision Memory Integration
The system SHALL auto-save each created decision to the memory system with type `decision` and tags derived from the slug.

#### Scenario: Decision saved to memory
Given the memory system is available
When a decision is created
Then a memory entry is saved with type "decision"

### Requirement: Decision Generator Integration
The generator SHALL include a "Decision Records" section in AGENTS.md listing active decision titles with links to their files.

#### Scenario: AGENTS.md includes decisions
Given 3 accepted decisions exist
When the generator runs
Then AGENTS.md contains a "Decision Records" section with 3 linked entries
