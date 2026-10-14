## 1. Implementation
- [x] 1.1 Build-time hash catalogue from git tags (rules, agents, skills, hooks since v5)
- [x] 1.2 Cleanup moves matches to .rulebook/backup and reports edited files
- [x] 1.3 MANAGED_EVENTS covers every event + settings.local.json; strip missing-script entries
- [x] 1.4 Agent/skill refresh on update; language substitution fix
- [x] 1.5 Shipped agents: drop or raise `maxTurns` (today 15–30, below the p50 63 calls of a subagent; F-043) and fix the language substitution in descriptions
- [x] 1.6 Dry run on copies of Synap, ar-v3-dashboard, UzEngine; record token counts before/after
  - Synap 5,257 → 1,520; ar-v3-dashboard 4,462 → 1,487; UzEngine 3,841 → 1,472 (cl100k: CLAUDE.md block + always-on rulebook rules + agent/skill listing lines); second update is a no-op

## Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (CHANGELOG entry + affected guides/specs) — docs/guides/migration-v6-to-v7.md; CHANGELOG bullets handed to the release step
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass (type-check → lint → tests)
