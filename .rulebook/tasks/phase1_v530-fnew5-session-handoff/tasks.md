# Tasks: F-NEW-5 — Session handoff & freshness manager

## 1. Stop hook
- [ ] 1.1 Create `templates/hooks/check-context-and-handoff.sh` (bash) and `.ps1` variant
- [ ] 1.2 Resolve `transcript_path` from hook input JSON; fall back to most recent JSONL in `~/.claude/projects/`
- [ ] 1.3 Estimate token count (line+char heuristic; tiktoken if available)
- [ ] 1.4 Compare against `warn_threshold_pct` / `force_threshold_pct` from `.rulebook/rulebook.json`
- [ ] 1.5 Emit `additionalContext` JSON instructing `/handoff` invocation when ≥ warn
- [ ] 1.6 Write sentinel `.rulebook/handoff/.urgent` when ≥ force

## 2. `/handoff` skill
- [ ] 2.1 Create `templates/skills/handoff.md` with the exact prompt the model must follow
- [ ] 2.2 Skill writes `.rulebook/handoff/_pending.md` with: active task, decisions, files touched, next steps, resume command, blockers
- [ ] 2.3 Skill output always ends with `>>> TYPE /clear NOW — your context will be auto-restored <<<`
- [ ] 2.4 Skill respects `.urgent` sentinel (skip confirmations)

## 3. SessionStart hook
- [ ] 3.1 Create `templates/hooks/resume-from-handoff.sh` (bash) and `.ps1` variant
- [ ] 3.2 Detect `.rulebook/handoff/_pending.md`; emit its content as `additionalContext`
- [ ] 3.3 Move `_pending.md` → `.rulebook/handoff/<ISO-timestamp>.md`
- [ ] 3.4 Clear `.urgent` sentinel if present
- [ ] 3.5 Enforce `max_history_files` (oldest pruned)

## 4. Mandatory rule
- [ ] 4.1 Create `templates/rules/respect-handoff-trigger.md` (always-on, no `paths:` frontmatter)

## 5. Config & bootstrap
- [ ] 5.1 Add `handoff` section to `RulebookConfig` type with defaults (`warn=75`, `force=90`, `tokenizer=auto`, `max_history_files=50`)
- [ ] 5.2 `rulebook init` creates `.rulebook/handoff/` directory
- [ ] 5.3 `rulebook init` adds `.rulebook/handoff/.urgent` and `.rulebook/handoff/_pending.md` to `.gitignore` (history files stay tracked)
- [ ] 5.4 `rulebook init` wires both hooks into `.claude/settings.json` (PreToolUse=Stop, SessionStart)

## 6. Tail (mandatory)
- [ ] 6.1 Update or create documentation covering the implementation
- [ ] 6.2 Write tests covering the new behavior (token estimation thresholds, hook output JSON shape, resume cycle, idempotency, history pruning)
- [ ] 6.3 Run tests and confirm they pass
