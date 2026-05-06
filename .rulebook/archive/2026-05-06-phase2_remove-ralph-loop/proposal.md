# Proposal: phase2_remove-ralph-loop

## Why

The Ralph autonomous loop subsystem (`rulebook ralph init|run|status|history|
pause|resume`) is a sizeable surface area — ~7 source files, ~6 test files,
12 shell/batch scripts, 6 slash commands, an MCP tool group, and a Cursor MDC
template — that has grown beyond the project's appetite to maintain it. It
duplicates concerns better handled by Claude Code's built-in `/loop` skill
and by the standard task workflow (`rulebook_task_create` →
`rulebook_task_update` → `rulebook_task_archive`), and its 5-gate quality
enforcement is already provided by the project's pre-commit hooks and
`rulebook doctor run`.

Keeping Ralph in-tree means:
- Ongoing test maintenance for a feature few users opt into.
- Spec drift between `RULEBOOK.md` (canonical task workflow) and Ralph's PRD
  format (`userStories[].passes`).
- A second source of truth for "what's the next task" (PRD vs `tasks.md`),
  which has already caused confusion in past sessions.

Removing Ralph reduces the codebase, eliminates a redundant workflow, and
narrows the project's contract surface to one task model.

## What Changes

- Remove all Ralph runtime code:
  - `src/agents/ralph-parser.ts`
  - `src/cli/commands/ralph.ts`
  - `src/core/ralph-manager.ts`
  - `src/core/ralph-parallel.ts`
  - `src/core/ralph-plan-checkpoint.ts`
  - `src/core/ralph-scripts.ts`
  - All `tests/ralph-*.test.ts` files
- Remove the `ralph` subcommand registration from `src/cli/commands/index.ts`
  and any export from `src/index.ts`.
- Remove Ralph MCP tools from `src/mcp/rulebook-server.ts`
  (`rulebook_ralph_init`, `rulebook_ralph_run`, `rulebook_ralph_status`,
  `rulebook_ralph_get_iteration_history`).
- Remove Ralph shell/batch scripts:
  - `templates/ralph/*.sh`, `templates/ralph/*.bat`
  - `.rulebook/scripts/ralph-*.sh`, `.rulebook/scripts/ralph-*.bat`
- Remove Ralph slash commands:
  - `.claude/commands/ralph-init.md`, `ralph-run.md`, `ralph-status.md`,
    `ralph-history.md`, `ralph-pause-resume.md`, `ralph-config.md`
- Remove Ralph IDE templates:
  - `templates/ides/cursor-mdc/ralph.mdc`
  - `.cursor/rules/ralph.mdc`
- Remove Ralph references from documentation:
  - `AGENTS.md` (the "Ralph Autonomous Loop" section)
  - `templates/AGENTS.md` if present
  - `README.md` mentions
  - `CHANGELOG.md` — add a removal entry, do not delete history
- Strip Ralph types from `src/types.ts` and any cross-references in
  `src/core/{generator,config-manager,state-writer,prd-generator,
  iteration-tracker,health-scorer}.ts`.
- Remove `rulebook ralph` rows from any token-optimization / delegation tables
  and the agent automation spec.
- Remove `.rulebook/ralph/` runtime directory creation from the installer.
- Update the `init` command and templates so a fresh `rulebook init` does not
  scaffold any Ralph artifacts.

## Impact

- Affected specs:
  - `RULEBOOK.md` — remove "Ralph Autonomous Loop" subsection.
  - `AGENT_AUTOMATION.md` — remove Ralph integration notes if any.
  - `RULEBOOK_MCP.md` — remove `rulebook_ralph_*` MCP tool entries.
- Affected code: every file listed above.
- Breaking change: **YES**. Ship as a major version bump (e.g. v6.0.0) or
  document clearly in CHANGELOG. Users with existing `.rulebook/ralph/`
  state directories keep them — the runtime simply will not read them.
- User benefit: smaller install footprint, one task workflow instead of two,
  fewer MCP tool entries cluttering the agent's tool list, simpler mental
  model for new users.
