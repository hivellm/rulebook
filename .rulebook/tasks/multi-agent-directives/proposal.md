# Proposal: multi-agent-directives

## Why
Claude Code supports experimental multi-agent teams via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` environment flag, which significantly optimizes development by allowing parallel agent work. Rulebook should provide clear directives for multi-agent usage and automatically configure the flag in `.claude/settings.json` when Claude Code is detected, enabling teams out of the box.

## What Changes
- Create `templates/core/MULTI_AGENT.md` template with directives for multi-agent collaboration:
  - Team structure patterns (lead + specialists)
  - Task decomposition guidelines
  - Shared context and coordination rules
  - When to use teams vs single agent
- Auto-configure `.claude/settings.json` with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"` during `init`/`update`
- Add multi-agent skill template for Claude Code commands
- Update `setupClaudeCodeIntegration()` to set the env flag in settings.json
- Generate `.claude/agents/` directory with pre-configured agent definitions if multi-agent is enabled

## Impact
- Affected specs: RULEBOOK.md, CLAUDE_CODE.md
- Affected code: src/core/claude-mcp.ts, src/core/generator.ts, src/cli/commands.ts, templates/core/
- Breaking change: NO
- User benefit: Multi-agent development works out of the box, clear guidelines for team-based AI development
