<!-- OPENCODE:START -->
# OpenCode Integration

This project is managed by [@hivellm/rulebook](https://github.com/hivellm/rulebook).
The OpenCode integration mirrors the Claude Code experience inside the
[OpenCode](https://opencode.ai) terminal coding agent.

## What Rulebook generates for OpenCode

| File / Path | Purpose |
|---|---|
| `opencode.json` | Adds `$schema`, `mcp.rulebook`, and `instructions` (lazy-loads `AGENTS.md`, `AGENTS.override.md`, `.rulebook/specs/*.md`). Preserves all user-defined keys. |
| `.opencode/commands/<name>.md` | One file per user-invocable Rulebook slash command. |
| `.opencode/agents/<role>.md` | One file per Rulebook role agent, frontmatter translated. |
| `.opencode/skills/<name>/SKILL.md` | One directory per Rulebook dev skill, name-normalized to OpenCode's regex. |
| `.opencode/.rulebook-managed.json` | Sidecar so `rulebook update` knows which keys to refresh. |

## Critical rules

These mirror the rules every other Rulebook-supported tool follows:

1. **Read `AGENTS.md` and `AGENTS.override.md`** before making changes.
2. **Never revert or discard uncommitted work** — fix forward.
3. **Edit files sequentially**, not in parallel. For 3+ files, decompose
   into 1–2 file sub-tasks.
4. **Run type-check / lint before tests** — diagnostic-first.
5. **If a fix fails twice, escalate** — research, ask, or open a team.
6. **Prefer MCP tools** (`mcp__rulebook__*`) over shell commands.
7. **Capture learnings** at the end of significant work.
8. **Never archive a task** without docs updated, tests written, and
   tests passing.

## Model tier mapping

| Rulebook tier | OpenCode model |
|---|---|
| `haiku` | `anthropic/claude-haiku-4-5` |
| `sonnet` | `anthropic/claude-sonnet-4-6` |
| `opus` | `anthropic/claude-opus-4-7` |

## Permission synthesis

| Role type | `permission.edit` | `permission.bash` |
|---|---|---|
| Read-only (researcher, code-reviewer, security-reviewer, accessibility-reviewer, ux-reviewer, performance-engineer) | `deny` | `ask` |
| All other roles | `allow` | `allow` |

## Isolation

Set `OPENCODE_DISABLE_CLAUDE_CODE=*` if you want OpenCode to ignore a
`CLAUDE.md` shared with Claude Code, so only `AGENTS.md` is consulted.

## Documentation

- [opencode.ai/docs/rules](https://opencode.ai/docs/rules/)
- [opencode.ai/docs/config](https://opencode.ai/docs/config/)
- [opencode.ai/docs/mcp-servers](https://opencode.ai/docs/mcp-servers/)
- [opencode.ai/docs/commands](https://opencode.ai/docs/commands/)
- [opencode.ai/docs/agents](https://opencode.ai/docs/agents/)
- [opencode.ai/docs/skills](https://opencode.ai/docs/skills/)
- [opencode.ai/docs/permissions](https://opencode.ai/docs/permissions/)

<!-- OPENCODE:END -->
