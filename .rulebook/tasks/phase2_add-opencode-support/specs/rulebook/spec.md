# Spec: OpenCode Integration

## ADDED Requirements

### Requirement: OpenCode Detection
The system SHALL detect the presence of the OpenCode CLI in a project and
expose the result in `DetectionResult.opencode`.

#### Scenario: opencode.json present
Given a project root that contains an `opencode.json` or `opencode.jsonc` file
When `detectProject(cwd)` runs
Then `result.opencode.detected` is `true` and `result.opencode.hasConfigJson` is `true`

#### Scenario: .opencode directory present
Given a project root that contains a `.opencode/` directory but no `opencode.json`
When `detectProject(cwd)` runs
Then `result.opencode.detected` is `true` and `result.opencode.hasOpencodeDir` is `true`

#### Scenario: opencode binary on PATH
Given the `opencode` binary responds to `opencode --version`
When `ConfigManager.detectCLITools()` runs
Then the returned array includes `'opencode'`

#### Scenario: no signals
Given a project root with neither config file, `.opencode/` directory, nor binary
When `detectProject(cwd)` runs
Then `result.opencode.detected` is `false`

### Requirement: opencode.json Generation
The system SHALL generate or update `opencode.json` to expose the Rulebook MCP
server and project rule files without overwriting unrelated user settings.

#### Scenario: fresh project
Given a project with no existing `opencode.json`
When `generateOpencodeConfig(projectRoot, detection)` runs
Then `opencode.json` is created with `$schema`, `mcp.rulebook`, and `instructions` populated

#### Scenario: existing user config preserved
Given an `opencode.json` with user-defined `model`, `theme`, and `permission` keys
When `generateOpencodeConfig(...)` runs
Then those keys remain unchanged and only `$schema`, `mcp.rulebook`, and `instructions` are written

#### Scenario: MCP entry mirrors .mcp.json
Given a project with `.mcp.json` declaring a `rulebook` server
When `generateOpencodeConfig(...)` runs
Then `opencode.json:mcp.rulebook` mirrors that server's `command`, `args`, and `env`

#### Scenario: instructions are de-duplicated
Given an `opencode.json` whose `instructions` array already contains `AGENTS.md`
When `generateOpencodeConfig(...)` runs
Then `AGENTS.md` appears exactly once in the resulting array

### Requirement: Slash Command Bridge
The system SHALL emit OpenCode-compatible markdown command files for every
user-invocable Rulebook slash command.

#### Scenario: command file is generated
Given Rulebook ships a `/handoff` slash command
When `generateOpencodeCommands(projectRoot)` runs
Then `.opencode/commands/handoff.md` exists with valid YAML frontmatter and a prompt body

#### Scenario: user-owned command file is preserved
Given `.opencode/commands/handoff.md` exists without the `<!-- RULEBOOK:START -->` marker
When `generateOpencodeCommands(...)` runs
Then the file is left untouched

#### Scenario: managed command file is updated
Given `.opencode/commands/handoff.md` contains the RULEBOOK marker
When `generateOpencodeCommands(...)` runs
Then the file is rewritten with the latest template content

### Requirement: Role Agent Bridge
The system SHALL emit OpenCode-compatible agent definitions for every Rulebook
role agent.

#### Scenario: agent file is generated
Given the `researcher` role exists in `.claude/agents/`
When `generateOpencodeAgents(projectRoot)` runs
Then `.opencode/agents/researcher.md` exists with frontmatter `mode`, `description`, `model`, and `permission`

#### Scenario: model tier is mapped
Given a Rulebook agent declares `model: haiku`
When the OpenCode agent file is generated
Then its frontmatter `model` field equals `anthropic/claude-haiku-4-5`

#### Scenario: read-only role gets restrictive permissions
Given the `researcher` role is read-only by Rulebook convention
When the OpenCode agent file is generated
Then its `permission.edit` equals `deny` and `permission.bash` equals `ask`

### Requirement: Skills Bridge
The system SHALL emit OpenCode-compatible skill definitions that satisfy
OpenCode's strict frontmatter schema.

#### Scenario: skill name normalization
Given a Rulebook skill named `Rulebook_Terse_Commit`
When `generateOpencodeSkills(projectRoot)` runs
Then `.opencode/skills/rulebook-terse-commit/SKILL.md` exists with `name: rulebook-terse-commit` in its frontmatter

#### Scenario: description bounds are enforced
Given a source skill with a 2000-character description
When the OpenCode skill file is generated
Then the resulting `description` is truncated to ≤1024 characters

#### Scenario: name collision is rejected
Given two source skills normalize to the same OpenCode name
When `generateOpencodeSkills(...)` runs
Then the function throws an error naming both source skills

### Requirement: Idempotency and Re-run Safety
The system SHALL allow `rulebook update` to re-run all OpenCode generators
without losing user edits and without producing duplicate or stale managed files.

#### Scenario: update preserves managed-key list
Given `.opencode/.rulebook-managed.json` lists `mcp.rulebook` and `instructions`
When `generateOpencodeConfig(...)` runs again after the user adds a new key `agent.custom`
Then `agent.custom` is preserved and `mcp.rulebook` and `instructions` are refreshed

#### Scenario: removed source skill is cleaned up
Given a managed skill `.opencode/skills/foo/SKILL.md` exists but its source template was deleted
When `generateOpencodeSkills(...)` runs
Then the orphaned managed skill directory is removed

### Requirement: Opt-in / Opt-out
The system SHALL respect explicit user opt-in or opt-out for OpenCode integration.

#### Scenario: explicit opt-in via prompt
Given the user selects OpenCode in the `init` IDE prompt
When `init` completes
Then all four generators run regardless of detection result

#### Scenario: explicit opt-out via config
Given `rulebook.json` contains `cliTools` without `opencode` after the user removed it
When `update` runs
Then the OpenCode generators do not run and existing managed files are left in place
