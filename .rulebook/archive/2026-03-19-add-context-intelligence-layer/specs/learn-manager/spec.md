# Spec Delta: Learn Manager

## ADDED Requirements

### Requirement: Learning Capture
The system SHALL capture learnings to both the memory system (primary, searchable) and `.rulebook/learnings/<timestamp>-<slug>.md` (offline backup). Each learning MUST record `source` (manual/ralph/task-archive), optional `relatedTask`, and `tags`.

#### Scenario: Manual learning capture
Given no learnings exist
When the user captures a learning with title "JSONB null array gotcha" and content
Then the learning is saved to memory with type "learning" and written to `.rulebook/learnings/`

#### Scenario: Capture with related task
Given task "feature-auth" exists
When the user captures a learning with relatedTask "feature-auth"
Then the learning metadata includes the task reference

### Requirement: Ralph Learning Extraction
The `fromRalph()` operation SHALL read Ralph iteration history files, extract entries with non-empty `learnings` fields, deduplicate against existing learnings, and save new ones with `source: 'ralph'`.

#### Scenario: Extract learnings from Ralph
Given 5 Ralph iterations exist, 3 with non-empty learnings
When the user runs `learn from-ralph`
Then 3 new learnings are created with source "ralph"

#### Scenario: Deduplicate Ralph learnings
Given a Ralph learning was already extracted
When the user runs `learn from-ralph` again
Then the duplicate learning is not created again

### Requirement: Learning Promotion
The `promote` operation SHALL create a knowledge entry (via KnowledgeManager) or a decision (via DecisionManager) from an existing learning, and mark the learning as promoted with the target type and ID.

#### Scenario: Promote learning to pattern
Given learning "jsonb-null-gotcha" exists
When the user promotes it to knowledge type "pattern"
Then a new knowledge entry is created and the learning is marked as promoted

#### Scenario: Promote learning to decision
Given learning "switch-to-redis" exists
When the user promotes it to decision
Then a new decision is created and the learning is marked as promoted

### Requirement: Task Archive Integration
When archiving a task via CLI in interactive mode, the system SHALL prompt the user to optionally capture learnings. Captured learnings MUST have `source: 'task-archive'` and `relatedTask` set to the archived task ID.

#### Scenario: Archive task with learning
Given task "feature-auth" is being archived interactively
When the user confirms they have learnings
Then the system captures the learning with source "task-archive" and relatedTask "feature-auth"

#### Scenario: Archive task without learning
Given task "fix-typo" is being archived interactively
When the user declines the learning prompt
Then no learning is created and archival proceeds normally

### Requirement: Learning MCP Tools
The MCP server SHALL expose `rulebook_learn_capture`, `rulebook_learn_list`, and `rulebook_learn_promote` tools. All tools MUST accept optional `projectId` for workspace routing.

#### Scenario: Capture learning via MCP
Given the MCP server is running
When a client calls `rulebook_learn_capture` with title and content
Then a new learning is created and returned with success=true
