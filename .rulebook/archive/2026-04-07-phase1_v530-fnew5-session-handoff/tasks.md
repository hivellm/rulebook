# Tasks: F-NEW-5 — Session handoff & freshness manager

## 1. Stop hook
- [x] 1.1 Created `templates/hooks/check-context-and-handoff.sh`
- [x] 1.2 Created `templates/hooks/check-context-and-handoff.ps1`
- [x] 1.3 Reads thresholds from `.rulebook/rulebook.json` (defaults: warn=75%, force=90%)
- [x] 1.4 Emits `additionalContext` instructing `/handoff`; writes `.urgent` sentinel when ≥ force

## 2. `/handoff` skill
- [x] 2.1 Created `templates/skills/dev/handoff/SKILL.md` (writes _pending.md with session state)

## 3. SessionStart hook
- [x] 3.1 Created `templates/hooks/resume-from-handoff.sh`
- [x] 3.2 Created `templates/hooks/resume-from-handoff.ps1`
- [x] 3.3 Archives `_pending.md` → `.rulebook/handoff/<ISO-timestamp>.md`
- [x] 3.4 Clears `.urgent` sentinel
- [x] 3.5 Prunes old handoff files (configurable max_history, default 50)

## 4. Mandatory rule
- [x] 4.1 Created `templates/rules/respect-handoff-trigger.md` (always-on via ALWAYS_ON_RULES)

## 5. Config & bootstrap
- [x] 5.1 Added `handoff` section to `RulebookConfig`
- [x] 5.2 `init` creates `.rulebook/handoff/` directory
- [x] 5.3 `.gitignore` entries added via `ensureGitignoreEntries`
- [x] 5.4 Both hooks wired into `.claude/settings.json`

## 6. Tail (mandatory)
- [x] 6.1 Update or create documentation covering the implementation
- [x] 6.2 Write tests covering the new behavior
- [x] 6.3 Run tests and confirm they pass
