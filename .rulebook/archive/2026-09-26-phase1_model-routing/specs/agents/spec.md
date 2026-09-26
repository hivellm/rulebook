## ADDED Requirements

### Requirement: Agent definitions follow the v7.4 model routing
Every agent definition template under `templates/agents/` MUST declare an explicit `model:` in its frontmatter, and the value SHALL follow the routing rule: `fable` for architecture and code review (architect, code-reviewer, quality-gatekeeper, security-reviewer), `opus` for edits, tests, documentation, refactoring, build/perf work and orchestration (build-engineer, implementer, performance-engineer, tester, docs-writer, team-lead), and `haiku` for research (researcher).

#### Scenario: Reviewer agent is routed to Fable
Given the template `templates/agents/code-reviewer.md`
When its frontmatter is parsed
Then `model` equals `fable`

#### Scenario: Documentation agent is routed to Opus
Given the template `templates/agents/docs-writer.md`
When its frontmatter is parsed
Then `model` equals `opus`

### Requirement: Workflow scripts name an allowed model on every agent call
Every workflow template under `templates/claude-workflows/` MUST only use the models `fable`, `opus` and `haiku` — in `meta.phases` and in `agent()` options — and MUST NOT use `sonnet`. Review, verification, critique and design phases SHALL use `fable`; implementation, test, fix, commit and documentation phases SHALL use `opus`; research and discovery phases SHALL use `haiku`.

#### Scenario: No sonnet left in templates
Given every file under `templates/agents/` and `templates/claude-workflows/`
When the files are scanned for model values
Then none of them names `sonnet`

#### Scenario: Independent reviewer uses Fable
Given the workflow `templates/claude-workflows/rulebook-driver.js`
When its `Review` phase entry is read
Then its model is `fable`

### Requirement: Installed copies stay in sync
The repository's own `.claude/agents/*.md` and `.claude/workflows/*.js` MUST carry the same model values as the corresponding templates.

#### Scenario: Installed agent matches template
Given `templates/agents/implementer.md` and `.claude/agents/implementer.md`
When both frontmatters are parsed
Then both declare the same `model`
