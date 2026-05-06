---
name: "Opencode"
description: "OpenCode (open-source terminal coding agent by SST). Reads AGENTS.md natively. Rulebook generates opencode.json plus .opencode/commands, .opencode/agents, .opencode/skills."
version: "1.0.0"
category: "cli"
author: "Rulebook"
tags: ["cli", "opencode", "agents", "mcp"]
dependencies: []
conflicts: []
---
<!-- OPENCODE:START -->
# OpenCode Rules

**Tool**: [OpenCode](https://opencode.ai) — open-source terminal coding agent.

## Generated surface area

When Rulebook detects OpenCode (`opencode.json` / `.opencode/` / `opencode`
binary on PATH), it generates:

- `opencode.json` with `$schema`, `mcp.rulebook`, and `instructions`.
  Existing user keys (model, theme, permission, custom agents) are preserved.
- `.opencode/commands/<name>.md` for every user-invocable Rulebook slash
  command, with OpenCode-shaped frontmatter (`description`).
- `.opencode/agents/<role>.md` for every Rulebook role agent
  (researcher, implementer, tester, code-reviewer, architect, docs-writer,
  security-reviewer, build-engineer, team-lead, etc.) with model tier
  mapped (`haiku → claude-haiku-4-5`, `sonnet → claude-sonnet-4-6`,
  `opus → claude-opus-4-7`) and a synthesized `permission` block.
- `.opencode/skills/<normalized-name>/SKILL.md` for every Rulebook dev
  skill, name-normalized to `[a-z0-9](-[a-z0-9])*` (≤64 chars) and
  description bounded to ≤1024 chars.
- `.opencode/.rulebook-managed.json` — sidecar listing managed keys so
  `rulebook update` knows what to refresh vs. preserve.

## Idempotency

Files carrying the `<!-- RULEBOOK:START -->` marker are managed and
refreshed on every `rulebook update`. Files without the marker are
treated as user-owned and left untouched.

## Sequential editing

OpenCode follows the same Rulebook discipline as Claude Code:

- Edit files one at a time.
- For 3+ files, decompose into 1–2 file sub-tasks.
- Diagnostic-first: type-check / lint before tests.

## Quality gates

- Type-check / lint must be clean.
- Tests must pass.
- Coverage ≥95%.
- Pre-commit hooks enforce these — never `--no-verify`.

## MCP

`mcp.rulebook` in `opencode.json` exposes `rulebook_task_*`,
`rulebook_memory_*`, `rulebook_decision_*`, `rulebook_knowledge_*`,
`rulebook_learn_*`. Prefer MCP tools over shell commands when both
exist.

## Workflow

1. Reference `AGENTS.md` and `.rulebook/specs/*.md`.
2. Use `/rulebook-task-create`, `/rulebook-task-list`, `/handoff`.
3. Delegate to role agents (`@researcher`, `@implementer`, `@tester`).
4. Run quality checks before committing.
5. Save learnings (`rulebook_memory_save`, `rulebook_knowledge_add`).

## Documentation

- [opencode.ai/docs/rules](https://opencode.ai/docs/rules/)
- [opencode.ai/docs/config](https://opencode.ai/docs/config/)
- [opencode.ai/docs/mcp-servers](https://opencode.ai/docs/mcp-servers/)
- [opencode.ai/docs/commands](https://opencode.ai/docs/commands/)
- [opencode.ai/docs/agents](https://opencode.ai/docs/agents/)
- [opencode.ai/docs/skills](https://opencode.ai/docs/skills/)
- [opencode.ai/docs/permissions](https://opencode.ai/docs/permissions/)

<!-- OPENCODE:END -->
