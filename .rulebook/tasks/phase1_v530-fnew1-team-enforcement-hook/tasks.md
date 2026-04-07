# Tasks: F-NEW-1 — Team enforcement hook

## 1. Hook scripts
- [ ] 1.1 Create `templates/hooks/enforce-team-for-background-agents.sh` (bash, port of TML version)
- [ ] 1.2 Create `templates/hooks/enforce-team-for-background-agents.ps1` (PowerShell equivalent)
- [ ] 1.3 Both must read JSON from stdin and emit `permissionDecision` JSON on stdout

## 2. Settings.json wiring
- [ ] 2.1 Extend `src/core/generator.ts` to emit `.claude/settings.json` with `hooks.PreToolUse[].matcher: "Agent"` when `multi_agent: true`
- [ ] 2.2 Set `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in generated settings
- [ ] 2.3 Merge with existing user settings.json (never overwrite)

## 3. Config flag
- [ ] 3.1 Add `multi_agent: boolean` to `RulebookConfig` type
- [ ] 3.2 `rulebook init` prompts for it (default false), or auto-enables when `.claude/agents/` has ≥3 files

## 4. Rule template
- [ ] 4.1 Create `templates/rules/multi-agent-teams.md` explaining the policy

## 5. Tail (mandatory)
- [ ] 5.1 Update or create documentation covering the implementation
- [ ] 5.2 Write tests covering the new behavior (settings.json gen, hook syntax check, config flag)
- [ ] 5.3 Run tests and confirm they pass
