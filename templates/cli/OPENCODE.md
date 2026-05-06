<!-- OPENCODE:START -->
# OpenCode Rules

**Tool**: [OpenCode](https://opencode.ai) — open-source terminal coding agent (SST).

OpenCode reads `AGENTS.md` natively (with `CLAUDE.md` as fallback). When
Rulebook is initialized in this project, OpenCode also gets:

- `opencode.json` — declares the rulebook MCP server and lazy-loads the
  project rule files via the `instructions` array.
- `.opencode/commands/` — mirrors Rulebook's user-invocable slash commands
  (`/handoff`, `/rulebook-task-*`, `/rulebook-decision-*`,
  `/rulebook-knowledge-*`, `/rulebook-memory-*`, `/rulebook-learn-*`).
- `.opencode/agents/` — mirrors role agents (`researcher`, `implementer`,
  `tester`, `code-reviewer`, `architect`, etc.) translated to OpenCode's
  frontmatter schema (`mode`, `model`, `permission`).
- `.opencode/skills/` — mirrors the dev skill library normalized to
  OpenCode's strict skill-name regex.

## Quick Start

```bash
# Install OpenCode
curl -fsSL https://opencode.ai/install | bash

# In a Rulebook-managed project, OpenCode picks up everything automatically:
opencode
```

## Workflow

1. **Reference rules** — `AGENTS.md`, `AGENTS.override.md`, and
   `.rulebook/specs/*.md` are wired into `instructions` so the model
   has them on demand without burning context.
2. **Use slash commands** — type `/rulebook-task-create`,
   `/rulebook-task-list`, `/handoff`, etc. They're real OpenCode
   commands, not just prompt text.
3. **Delegate to role agents** — `@researcher analyze X`,
   `@implementer add Y`, `@tester cover Z`. Each role has its own
   `model`, `permission`, and `description` matching the Rulebook
   delegation table.
4. **Quality checks** — type-check / lint / test before committing,
   per `AGENTS.md` quality-gate rules.
5. **Save learnings** — `rulebook memory save`, `rulebook knowledge add`,
   `rulebook learn capture`, or invoke the corresponding slash commands.

## Sequential editing

OpenCode is held to the same Rulebook discipline as Claude Code:

- Edit files **one at a time** (Read → Edit → Read → Edit), not in batch.
- For 3+ files across subsystems, decompose into 1–2 file sub-tasks.
- Run diagnostics (type-check / lint) **before** the test suite.

## MCP & token usage

The `mcp.rulebook` entry in `opencode.json` exposes the full Rulebook
MCP toolset (`rulebook_task_*`, `rulebook_memory_*`, `rulebook_decision_*`,
`rulebook_knowledge_*`, etc.). Prefer MCP tools over shell commands when
both exist — they're faster, structured, and don't pollute context.

Output discipline: prefer concise output. Don't generate "Quality Checks"
status tables, "Next Steps" sections, or restate the question. Put
implementation details in code comments, not markdown.

## Isolation from Claude Code

OpenCode falls back to `CLAUDE.md` if `AGENTS.md` is absent. To force
OpenCode to ignore a `CLAUDE.md` shared with Claude Code, set:

```bash
export OPENCODE_DISABLE_CLAUDE_CODE=*
```

## Documentation

- [opencode.ai/docs/rules](https://opencode.ai/docs/rules/)
- [opencode.ai/docs/config](https://opencode.ai/docs/config/)
- [opencode.ai/docs/mcp-servers](https://opencode.ai/docs/mcp-servers/)
- [opencode.ai/docs/commands](https://opencode.ai/docs/commands/)
- [opencode.ai/docs/agents](https://opencode.ai/docs/agents/)
- [opencode.ai/docs/skills](https://opencode.ai/docs/skills/)
- [opencode.ai/docs/permissions](https://opencode.ai/docs/permissions/)

<!-- OPENCODE:END -->
