## 1. Implementation
- [ ] 1.1 Create `src/hooks/terse-config.ts` with mode resolution chain
- [ ] 1.2 Create `src/hooks/terse-activate.ts` SessionStart hook
- [ ] 1.3 Implement SKILL.md read + YAML strip + intensity filter regex
- [ ] 1.4 Create `src/hooks/terse-mode-tracker.ts` UserPromptSubmit hook
- [ ] 1.5 Implement slash-command parser (7 commands)
- [ ] 1.6 Implement natural-language activation/deactivation parser
- [ ] 1.7 Implement attention-anchor emission (JSON hookSpecificOutput)
- [ ] 1.8 Extend `ClaudeSettingsDesire` with `terseMode` field
- [ ] 1.9 Add terse entries to `SIGNATURES` table
- [ ] 1.10 Wire `upsertHook` calls for SessionStart + UserPromptSubmit in `applyClaudeSettings`
- [ ] 1.11 Register hook copy in `installHookScripts`

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass
