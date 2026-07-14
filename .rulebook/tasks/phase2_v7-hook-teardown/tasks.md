## 1. Implementation
- [ ] 1.1 Remove generation of Stop, UserPromptSubmit, and SessionStart hooks (handoff, terse, compact-reinject, update-check) from claude-settings-manager.ts and templates
- [ ] 1.2 Remove PreToolUse Agent (enforce-team-for-background-agents) generation and templates — P0: no denial of native subagent dispatch
- [ ] 1.3 Extend LEGACY_SIGNATURES with all retired v6 hook signatures so `rulebook update` strips them from existing settings.json
- [ ] 1.4 Rewrite enforce-pre-tool guard as path-only (task scaffolding protection), pure bash, no node, no content regexes; benchmark <10 ms
- [ ] 1.5 Move marker-comment and stub content checks (F-009 rules) into the pre-commit quality gate templates
- [ ] 1.6 Move the npm update check from SessionStart hook into the CLI itself
- [ ] 1.7 Add generator test: emitted settings.json has no Stop/UserPromptSubmit/SessionStart/PreToolUse-Agent entries and at most one Edit|Write guard

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass
