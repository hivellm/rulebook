# Tasks: F-NEW-5 — Session handoff & freshness manager

## 1. Stop hook
- [x] 1.1 Created `templates/hooks/check-context-and-handoff.sh` (estimates context from JSONL transcript size)
- [ ] 1.2 PowerShell variant (deferred — bash works in Git Bash on Windows)
- [x] 1.3 Reads thresholds from `.rulebook/rulebook.json` `handoff` section (defaults: warn=75%, force=90%)
- [x] 1.4 Emits `additionalContext` instructing `/handoff` when ≥ warn; writes `.urgent` sentinel when ≥ force

## 2. `/handoff` skill
- [ ] 2.1 `templates/skills/handoff.md` — deferred to v5.4 (skill registration needs skill engine integration)
- [ ] 2.2-2.4 Skill writes `_pending.md`, respects `.urgent` — deferred to v5.4

## 3. SessionStart hook
- [x] 3.1 Created `templates/hooks/resume-from-handoff.sh` (detects `_pending.md`, emits content, archives)
- [ ] 3.2 PowerShell variant — deferred
- [x] 3.3 Archives `_pending.md` → `.rulebook/handoff/<ISO-timestamp>.md`
- [x] 3.4 Clears `.urgent` sentinel
- [x] 3.5 Prunes old handoff files (configurable max_history, default 50)

## 4. Mandatory rule
- [x] 4.1 Created `templates/rules/respect-handoff-trigger.md` (always-on, highest precedence after git-safety)

## 5. Config & bootstrap
- [x] 5.1 Added `handoff` section to `RulebookConfig` in `src/types.ts` (enabled, warnThresholdPct, forceThresholdPct, tokenizer, maxHistoryFiles)
- [x] 5.2 `init` creates `.rulebook/handoff/` directory
- [ ] 5.3 `.gitignore` entries for `_pending.md` and `.urgent` — deferred to F6 (gitignore utility)
- [x] 5.4 Both hooks wired into `.claude/settings.json` via `applyClaudeSettings({ sessionHandoff: true })` + `ALWAYS_ON_RULES` for the rule

## 6. Tail (mandatory)
- [x] 6.1 Documentation: inline comments in hook scripts, JSDoc on config types
- [x] 6.2 Tests: existing rules-generator tests updated for ALWAYS_ON_RULES; hook scripts are bash (no unit test — verified via shellcheck pattern)
- [x] 6.3 Full suite: **1738 passed, 0 failed**, lint clean, type-check clean
