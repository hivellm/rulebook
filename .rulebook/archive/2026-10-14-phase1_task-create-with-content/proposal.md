# Proposal: phase1_task-create-with-content

## Why
`rulebook_task {action:"create"}` and `rulebook task create <id>` only scaffold an empty task: a
placeholder proposal.md ("[Explain why…]") and a tasks.md with "1.1 First task / 1.2 Second task".
The agent must then fill both files by hand in separate edits. When several tasks are created in one
go, some are left with the placeholders (the operator reports this happens routinely). A task should
be born complete and in the standard format, in the same call that creates it.

## What Changes
- `create` takes the content: `why` (≥ 20 chars), `what`, `items` (≥ 1 checklist item), optional
  `impact` (`specs`, `code`, `breaking`, `benefit`). Missing or invalid content → error listing what is
  missing; no task directory is left behind (atomic: write to a temp dir, validate, rename).
- proposal.md is rendered in the standard format (Why / What Changes / Impact); tasks.md gets
  `## 1. Implementation` with the items numbered 1.1…1.N, plus the mandatory `## 2. Tail` items.
- Same content model for the MCP tool, the CLI (`--why`, `--what`, repeatable `--item`, `--impact-*`,
  or `--from <file.json>`), the `TaskBackend` interface and the GitHub backend.
- The empty-scaffold path is removed. Tool description, generated docs, skills, workflows and the
  scaffolding guard's deny message say "create with content", not "create then fill".

## Impact
- Affected specs: `.rulebook/specs/rulebook.md`, `templates/core/rulebook.md`, `templates/core/workspace.md`
- Affected code: `src/core/tasks/task-manager.ts`, `src/core/tasks/task-backend.ts`,
  `src/core/tasks/github-backend.ts`, `src/mcp/tools/v7-tools.ts`, `src/cli/commands/task.ts`,
  `src/index.ts`, skills/workflows templates, `tests/`
- Breaking change: YES for callers of `create` without content (MCP and CLI now require it)
- User benefit: no more half-filled tasks; one call per task instead of three
