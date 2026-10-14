## 1. Implementation
- [ ] 1.1 Build-time hash catalogue from git tags (rules, agents, skills, hooks since v5)
- [ ] 1.2 Cleanup moves matches to .rulebook/backup and reports edited files
- [ ] 1.3 MANAGED_EVENTS covers every event + settings.local.json; strip missing-script entries
- [ ] 1.4 Agent/skill refresh on update; language substitution fix
- [ ] 1.5 Shipped agents: drop or raise `maxTurns` (today 15–30, below the p50 63 calls of a subagent; F-043) and fix the language substitution in descriptions
- [ ] 1.6 Dry run on copies of Synap, ar-v3-dashboard, UzEngine; record token counts before/after

## Tail (docs + tests — check or waive with tailWaiver)
- [ ] 2.1 Update or create documentation covering the implementation (CHANGELOG entry + affected guides/specs)
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass (type-check → lint → tests)
