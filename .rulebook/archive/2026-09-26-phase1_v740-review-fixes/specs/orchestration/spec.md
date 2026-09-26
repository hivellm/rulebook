# Orchestration review fixes (v7.4.0)

## MODIFIED Requirements

### Requirement: Delegation Without Ceremony For Small Fixes
The orchestration spec SHALL require the main session to delegate every task,
including small ones, and SHALL apply the rulebook task cycle (proposal, tasks,
specs, archive) only when the work has a rulebook task. A small fix MUST be
delegated with a brief and come back as a report, without task ceremony.

#### Scenario: Small fix is delegated without a rulebook task
Given the main session receives a one-line bug fix request
When it delegates the fix to a subagent
Then the subagent works from the brief and returns a report without creating or archiving a rulebook task

#### Scenario: Multi-phase work keeps the task cycle
Given the work has a rulebook task
When a subagent owns it
Then the subagent fills proposal, tasks and specs, runs the gate and archives the task

### Requirement: MCP Reference Defers To Orchestration Section
The generated `.claude/rules/mcp-tool-reference.md` MUST NOT say orchestration is
the agent's call and SHALL point to the Orchestration section of CLAUDE.md.

#### Scenario: MCP reference generated
Given a project with an MCP server configured
When the MCP tool reference is generated
Then the file says the work is delegated per the Orchestration section of CLAUDE.md

### Requirement: Skill Templates Follow Model Routing
Every `model:` value in `templates/skills/**/SKILL.md` MUST be one of fable, opus or haiku.

#### Scenario: Skill template scanned
Given any skill template with a model line
When its frontmatter is parsed
Then the model is fable, opus or haiku and never sonnet
