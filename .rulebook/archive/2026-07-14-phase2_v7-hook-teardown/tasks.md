## 1. Implementation
- [x] 1.1 Remove generation of Stop, UserPromptSubmit, and SessionStart hooks (handoff, terse, compact-reinject, update-check) from claude-settings-manager.ts and templates — manager rewritten v7; 14 hook templates + compact-context deleted
- [x] 1.2 Remove PreToolUse Agent (enforce-team-for-background-agents) generation and templates — P0: no denial of native subagent dispatch; teamsEnv desire only enables the feature flag
- [x] 1.3 Extend LEGACY_SIGNATURES with all retired v6 hook signatures so `rulebook update` strips them from existing settings.json — 12 signatures, stripped across all 4 managed events on every sync
- [x] 1.4 Rewrite enforce-pre-tool guard as path-only (task scaffolding protection), pure bash, no node, no content regexes; benchmark <10 ms — protect-task-scaffolding.sh; script logic <1 ms (bash spawn floor ~5 ms Linux / ~40 ms Windows dominates)
- [x] 1.5 Move marker-comment and stub content checks (F-009 rules) into the pre-commit quality gate templates — staged-ADDED-lines-only marker gate in all 15 language pre-commit scripts (no false positives on existing content)
- [x] 1.6 Move the npm update check from SessionStart hook into the CLI itself — src/utils/update-check.ts (24h cache, 2s timeout, silent fail) wired into init + update
- [x] 1.7 Add generator test: emitted settings.json has no Stop/UserPromptSubmit/SessionStart/PreToolUse-Agent entries and at most one Edit|Write guard — hook-audit tests in claude-settings-manager.test.ts
- [x] 1.8 Generate the full-autonomy permission profile (defaultMode acceptEdits + broad allow set, draft 6.4) replacing the read-only SAFE_PERMISSIONS list — FULL_AUTONOMY_PERMISSIONS in manager, wired in init/update/claude setup
- [x] 1.9 Add generator test: autonomy profile present, user-authored permissions never removed or tightened on update — never-tighten test (user defaultMode wins, deny list preserved, no duplicates)

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update or create documentation covering the implementation — CHANGELOG phase2 sections + impact ledger row
- [x] 2.2 Write tests covering the new behavior — settings-manager v7 suite, guard shell tests, setup-flag tests; retired hook test files removed
- [x] 2.3 Run tests and confirm they pass — full suite green: 851 tests passing
