# Proposal: F-NEW-1 — Built-in Agent-team enforcement hook

Source: [docs/analysis/v5.3.0/05-tml-hooks.md#b1](../../../docs/analysis/v5.3.0/05-tml-hooks.md)

## Why
Production hook in `F:\Node\hivellm\tml\.claude\hooks\enforce_team_for_background_agents.sh` validates this pattern: standalone background `Agent` calls cannot communicate (only Teams expose `SendMessage`). Models silently spawn isolated workers and lose coordination. Codifying this as a built-in rulebook artifact gives every multi-agent project the same guardrail.

## What Changes
- Ship `templates/hooks/enforce-team-for-background-agents.sh` (port of TML's hook) plus a `.ps1` variant.
- Auto-wire in generated `.claude/settings.json` under `hooks.PreToolUse[].matcher: "Agent"` when `multi_agent: true`.
- Set env `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in generated settings.json.
- Add matching rule `templates/rules/multi-agent-teams.md` so the deny reason has a doc to cite.
- Pairs with F8 (multi-agent module).

## Impact
- Affected specs: `templates/hooks/`, `templates/rules/multi-agent-teams.md` (new)
- Affected code: `src/core/generator.ts`, `src/core/config-manager.ts`
- Breaking change: NO (opt-in)
- User benefit: parallel background agents forced through Teams, eliminating the silent-loss-of-coordination failure mode
