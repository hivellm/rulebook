# Orchestration directive (v7.4)

## ADDED Requirements

### Requirement: Main session orchestrates, never executes
The generated CLAUDE.md and lean AGENTS.md MUST state that the main session never executes the work itself and delegates each task to a subagent, and MUST point to `.rulebook/specs/orchestration.md` for details.

#### Scenario: CLAUDE.md carries the directive
Given a project with no prior rulebook files
When `generateClaudeMd` renders CLAUDE.md
Then the `## Orchestration` section says the main session never executes the work itself and delegates every task to a subagent
And it references `.rulebook/specs/orchestration.md`

#### Scenario: lean AGENTS.md carries the directive
Given a lean-mode project config
When `generateLeanAgents` renders AGENTS.md
Then the rules list says the main session delegates every task to a subagent
And the specs index lists `/.rulebook/specs/orchestration.md`

### Requirement: Model routing
The generated rules SHALL route work by model: Fable 5.1 for architecture, complex bugs and code review; Opus 5.5 for edits, tests, documentation and refactoring; Haiku 4.5 for research and summaries. They MUST forbid Fable for simple work and MUST require the model to be specified in every agent call.

#### Scenario: routing table present in every surface
Given the core templates
When CLAUDE.md, lean AGENTS.md and the orchestration spec are generated
Then each names Fable 5.1, Opus 5.5 and Haiku 4.5 with their task types

### Requirement: Orchestration spec is always generated
`generateModularAgents` MUST write `.rulebook/specs/orchestration.md` wrapped in `<!-- ORCHESTRATION:START -->` / `<!-- ORCHESTRATION:END -->` on every run, independent of project config.

#### Scenario: spec file written
Given any project config
When `generateModularAgents` runs
Then `.rulebook/specs/orchestration.md` exists and starts with `<!-- ORCHESTRATION:START -->`

### Requirement: Subagent contract and main-session duties
The orchestration spec SHALL require one subagent per task, planning before executing, independent subagents in parallel, and the main session reading reports rather than files. Each subagent MUST keep its rulebook task updated and drive it through archive. The main session MUST monitor agents, pause or restart an agent that stalls or drifts, review the archived task, and update the CHANGELOG.

#### Scenario: contract clauses present
Given the orchestration template
When `generateCoreRules('orchestration')` is read
Then it contains the one-subagent-per-task rule, the read-reports rule, the subagent archive duty, the pause/restart duty and the CHANGELOG duty
