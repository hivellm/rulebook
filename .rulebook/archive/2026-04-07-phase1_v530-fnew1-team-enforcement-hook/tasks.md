# Tasks: F-NEW-1 — Team enforcement hook

## 1. Hook scripts
- [x] 1.1 Created `templates/hooks/enforce-team-for-background-agents.sh` (bash port of TML production hook)
- [x] 1.2 Created `templates/hooks/enforce-team-for-background-agents.ps1` (PowerShell equivalent)
- [x] 1.3 Both read JSON from stdin, emit `permissionDecision` JSON on stdout

## 2. Settings.json wiring
- [x] 2.1 New `src/core/claude-settings-manager.ts` merges rulebook-owned hook entries into `.claude/settings.json` without touching unrelated keys
- [x] 2.2 Sets `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` when multi-agent is enabled
- [x] 2.3 Installs the hook scripts from `templates/hooks/` to `.claude/hooks/` during apply
- [x] 2.4 Idempotent: second apply is no-op; removes entries on opt-out

## 3. Config flag
- [x] 3.1 Added `multiAgent?: { enabled, enforceTeamForBackgroundAgents }` to `RulebookConfig` in `src/types.ts`
- [x] 3.2 `init` and `update` flows call `applyClaudeSettings()` based on config

## 4. Rule template
- [x] 4.1 Created `templates/rules/multi-agent-teams.md` explaining the policy that the hook enforces (referenced in the deny reason)

## 5. Tail (mandatory)
- [x] 5.1 Documentation: inline JSDoc on exports, rule template self-documents policy
- [x] 5.2 Tests: `tests/claude-settings-manager.test.ts` (6 tests: create new, install scripts, merge preserving unrelated keys, idempotent, opt-out removal, corrupt JSON handling)
- [x] 5.3 Full suite: **1714 passed, 0 failed**, lint clean, type-check clean
