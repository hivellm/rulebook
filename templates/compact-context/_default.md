# Post-compaction cheat sheet

This file is re-injected after every conversation compaction. Keep it
**short (≤50 lines)** and only include directives that must survive
compaction. Everything else belongs in `CLAUDE.md`, `AGENTS.md`, or
`.claude/rules/`.

## Critical reminders

- Read `AGENTS.md` and `AGENTS.override.md` before making changes.
- Never revert or discard uncommitted work — fix forward.
- Edit files sequentially, not in parallel (see `.claude/rules/sequential-editing.md`).
- Run diagnostics (`type-check`, `lint`) before running the full test suite.
- If a fix fails twice, stop and escalate — do not retry a third time.
- Prefer MCP tools over shell commands when an equivalent MCP tool exists.
- Save learnings to `.rulebook/learnings/` at the end of significant work.

## Project-specific reminders

(Edit this file to add reminders unique to your project. Examples:
build command, primary language toolchain, forbidden directories,
where canonical documentation lives, critical files that must not
be touched without review.)
