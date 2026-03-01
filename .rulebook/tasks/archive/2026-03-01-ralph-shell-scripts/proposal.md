# Proposal: ralph-shell-scripts

## Why
Ralph autonomous loop depends on MCP server for initialization and execution, but MCP is rarely used by AI tools in target projects. AI agents need a way to invoke Ralph directly via shell scripts without MCP dependency. Scripts must work cross-platform (.bat for Windows, .sh for Unix).

## What Changes
- Create `templates/ralph/` directory with shell script templates:
  - `ralph-init.sh` / `ralph-init.bat` — Initialize Ralph PRD and config
  - `ralph-run.sh` / `ralph-run.bat` — Start the autonomous loop
  - `ralph-status.sh` / `ralph-status.bat` — Check loop status
  - `ralph-pause.sh` / `ralph-pause.bat` — Pause/resume loop
  - `ralph-history.sh` / `ralph-history.bat` — View iteration history
- Install scripts to `.rulebook/scripts/` during `init` and `update` commands
- Scripts invoke `npx @hivehub/rulebook ralph <command>` under the hood
- Generator and commands updated to scaffold scripts directory

## Impact
- Affected specs: RALPH.md, RULEBOOK.md
- Affected code: src/core/generator.ts, src/cli/commands.ts, templates/ralph/
- Breaking change: NO
- User benefit: AI agents can control Ralph without MCP, enabling autonomous loop in any project with just shell access
