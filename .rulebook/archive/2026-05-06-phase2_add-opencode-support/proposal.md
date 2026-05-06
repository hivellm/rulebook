# Proposal: phase2_add-opencode-support

## Why

Rulebook currently ships first-class IDE/CLI integrations for Cursor, Claude
Code, Gemini CLI, Continue.dev, Windsurf, and GitHub Copilot. **OpenCode**
([opencode.ai](https://opencode.ai)) — an open-source terminal coding agent by
SST — is in active use on at least one downstream project but has only a stub
template (`templates/cli/OPENCODE.md`, 18 LOC) and a stub skill
(`templates/skills/cli/opencode/SKILL.md`, 28 LOC). There is no detector, no
generator, no `opencode.json` emitter, no command/agent/skill bridge, and no
inclusion in `cliTools` autodetection.

The integration is high-leverage because OpenCode reads `AGENTS.md` natively
(with `CLAUDE.md` as fallback) — meaning the bulk of Rulebook's content
already flows in for free. What is missing is the **OpenCode-specific surface
area** that lets the Rulebook MCP server, slash commands, custom agents, and
skill library be visible inside OpenCode the same way they are visible inside
Claude Code today:

- `opencode.json` declaring the `rulebook` MCP server (so `mcp__rulebook__*`
  tools are callable from OpenCode without manual setup).
- `instructions` array in `opencode.json` lazy-loading the project's
  `.rulebook/specs/*.md` and override files.
- `.opencode/commands/<name>.md` mirroring the user-invocable Rulebook slash
  commands (`/handoff`, `/analysis`, `/continue`, `/ralph-*`,
  `/rulebook-task-*`, `/rulebook-decision-*`, `/rulebook-knowledge-*`,
  `/rulebook-memory-*`, `/rulebook-learn-*`, terse-mode trio).
- `.opencode/agents/<name>.md` mirroring the role agents under
  `.claude/agents/` (researcher, implementer, tester, code-reviewer,
  architect, etc.), translated to OpenCode's frontmatter schema
  (`mode: subagent | primary`, `model`, `temperature`, `permission`).
- `.opencode/skills/<name>/SKILL.md` rewritten to satisfy OpenCode's stricter
  skill schema (`name` must be 1-64 chars, lowercase alphanumeric with single
  hyphen separators; `description` 1-1024 chars).

Without these, OpenCode users on a Rulebook-managed project see the rules but
cannot trigger `/rulebook-task-create`, cannot reach Rulebook MCP tools, and
cannot delegate to the project's role agents — they get a degraded experience
relative to Claude Code or Cursor.

## What Changes

### Detection (`src/core/detect/detector.ts`, `src/types.ts`)

- Add `opencode?: { detected: boolean; hasConfigJson: boolean; hasOpencodeDir: boolean }`
  to `DetectionResult`.
- Implement `detectOpencode(cwd)` checking for `opencode.json`,
  `opencode.jsonc`, `.opencode/`, or `opencode` binary in `cliTools`.
- Add `'opencode'` to the `cliTools` probe list in
  `config-manager.ts:detectCLITools()`.

### Generator (`src/core/ide/opencode-generator.ts` — new)

- `generateOpencodeConfig(projectRoot, detection)` — idempotent merge into
  `opencode.json` (or `.jsonc` when comments are usable). Manages exactly
  three keys, leaves everything else untouched:
  - `mcp.rulebook` — `{ type: "local", command: ["npx", "-y", "@hivellm/rulebook-mcp"], enabled: true }`
    (mirrors `.mcp.json` if present).
  - `instructions` — appends `AGENTS.md`, `AGENTS.override.md`, and
    `.rulebook/specs/*.md` (de-duplicated; user-added entries preserved).
  - `$schema` — sets `https://opencode.ai/config.json` if absent.
  - Writes a sibling `.opencode/.rulebook-managed.json` listing managed keys
    so future updates know what to overwrite vs. preserve.
- `generateOpencodeCommands(projectRoot)` — for each user-invocable Rulebook
  slash command, write `.opencode/commands/<name>.md` with frontmatter
  `{ description, agent?, model?, subtask? }` and the prompt template body.
  Reuses content from `templates/skills/**/SKILL.md` where the skill is
  command-shaped; otherwise generates from a new
  `templates/ides/opencode/commands/` source.
- `generateOpencodeAgents(projectRoot)` — for each role agent in
  `.claude/agents/` (or `templates/agents/`), emit `.opencode/agents/<role>.md`
  with frontmatter translated:
  - `description` — copied
  - `mode: subagent` (default) or `primary` for orchestrators
  - `model` — copied; map `haiku → anthropic/claude-haiku-4-5`,
    `sonnet → anthropic/claude-sonnet-4-6`,
    `opus → anthropic/claude-opus-4-7`
  - `permission` — synthesized from rulebook safety rules (deny destructive
    bash patterns, ask on edit for read-only roles).
- `generateOpencodeSkills(projectRoot)` — for each skill in
  `templates/skills/**/SKILL.md`, emit `.opencode/skills/<normalized-name>/SKILL.md`
  with name normalized to OpenCode's regex (`[a-z0-9](-[a-z0-9])*`,
  ≤64 chars) and description truncated/expanded to fit 1-1024 chars.
- All four functions follow the existing `multi-tool-generator.ts` idempotent
  pattern: presence of a `<!-- RULEBOOK:START -->` marker (or
  `_rulebook_managed: true` JSON key) means we may overwrite; absence means
  the file is user-owned and we skip.

### CLI wiring

- `src/cli/commands/init.ts` — invoke the four generators when
  `detection.opencode.detected` is true OR when the user opts in via the IDE
  selection prompt.
- `src/cli/commands/update.ts` — re-run the generators (preserving user
  edits) the same way `multi-tool-generator` is re-run today.
- `src/cli/prompts.ts` — add OpenCode to the list of selectable IDEs/CLIs.

### Templates

- `templates/cli/OPENCODE.md` — expand from 18-line stub to a full guidance
  block matching `templates/cli/CLAUDE_CODE.md`'s depth (sequential editing,
  test discipline, quality gates, MCP usage notes).
- `templates/skills/cli/opencode/SKILL.md` — same expansion.
- `templates/ides/opencode/` (new) — `commands/`, `agents/`, `skills/`,
  `opencode.json.template` source files used by the generator.
- `templates/ides/OPENCODE.md` (new) — equivalent of
  `templates/ides/CURSOR.md` etc. for the rules block.

### MCP server packaging note

OpenCode's MCP `command` array points at `npx -y @hivellm/rulebook-mcp`. If
the package is not yet published under that name, the task adds an item to
verify the published name (`npm view`) and either (a) update the command to
the actual published name, or (b) document a `node /absolute/path/server.js`
fallback for local-only use until publication.

## Impact

- **Affected specs**:
  - New: `.rulebook/tasks/phase2_add-opencode-support/specs/rulebook/spec.md`
    (ADDED Requirements: detection, generation, idempotency, schema
    compliance, opt-in/out).
  - Touched: `.rulebook/specs/RULEBOOK.md` (add OpenCode to the supported
    tools matrix).
- **Affected code**:
  - New: `src/core/ide/opencode-generator.ts`,
    `tests/opencode-generator.test.ts`, `tests/detect-opencode.test.ts`.
  - Modified: `src/types.ts`, `src/core/detect/detector.ts`,
    `src/core/state/config-manager.ts`, `src/cli/commands/init.ts`,
    `src/cli/commands/update.ts`, `src/cli/prompts.ts`, `src/index.ts`
    (export the new generator).
  - New templates: `templates/ides/opencode/**`,
    `templates/ides/OPENCODE.md`; expanded
    `templates/cli/OPENCODE.md`, `templates/skills/cli/opencode/SKILL.md`.
- **Breaking change**: NO. Pure additive integration. Existing OpenCode
  users with a hand-written `opencode.json` get a non-destructive merge that
  only adds keys never present.
- **User benefit**: OpenCode users on Rulebook-managed projects gain the
  same first-class experience Claude Code users have today — MCP tools
  callable, slash commands available, role agents delegatable, skills
  loadable on-demand — with zero manual configuration.

## Notes / open coordination

- Pending sibling task `phase2_remove-multi-tool-generator` will delete
  `src/core/multi-tool-generator.ts`. The new opencode generator MUST live in
  its own file (`src/core/ide/opencode-generator.ts`) so the deletion of the
  multi-tool generator does not regress this integration.
- OpenCode supports `OPENCODE_DISABLE_CLAUDE_CODE=*` env vars to suppress
  Claude Code fallback. Document this in the rules template so users on
  shared `.claude/` workspaces know how to isolate.
- Sources for adapter design:
  [opencode.ai/docs/rules](https://opencode.ai/docs/rules/),
  [config](https://opencode.ai/docs/config/),
  [mcp-servers](https://opencode.ai/docs/mcp-servers/),
  [commands](https://opencode.ai/docs/commands/),
  [agents](https://opencode.ai/docs/agents/),
  [skills](https://opencode.ai/docs/skills/),
  [permissions](https://opencode.ai/docs/permissions/).
