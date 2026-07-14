## 1. Implementation
- [x] 1.1 Implement `rulebook update` v6→v7 path: lean rewrite of CLAUDE.md/AGENTS.md preserving AGENTS.override.md — landed across phases 1–4 (version-tolerant sentinels; merger regex fix in phase5a)
- [x] 1.2 Strip all retired v6 hook entries via the signature mechanism and remove rulebook-owned retired files — LEGACY_SIGNATURES (phase2) + new src/core/migration/v6-cleanup.ts (rules/hooks/skills/specs/handoff/terse leftovers; user-authored files preserved via ownership markers; uppercase specs renamed lowercase)
- [x] 1.3 Migrate `.mcp.json` to the slim server entrypoint during update — configureMcpJson now upgrades legacy 'mcp-server' entries to the rulebook-mcp bin in place
- [x] 1.4 Add `--dry-run` with a full diff summary before any write — update --dry-run prints regen/strip/remove/rename/keep plan and exits; smoke-tested on this repo (clean plan)
- [x] 1.5 Add CI acceptance checks — file token budget + P0 (context-budget.test.ts), hook audit + autonomy never-tighten (claude-settings-manager.test.ts), MCP schema/count/init budgets (new v7-budgets.test.ts, dist-guarded)
- [x] 1.6 Write the v6→v7 migration guide in /docs with measured before/after numbers — docs/guides/migration-v6-to-v7.md
- [x] 1.7 Update README and CHANGELOG for the 7.0.0 release — README v7 banner + corrected claude-setup description; CHANGELOG consolidated in the version-bump commit
- [x] 1.8 Consolidate the impact ledger into the final v7 performance report with per-change deltas vs the v6 baseline — Final Results table (targets vs shipped) in docs/analysis/v7-performance/README.md

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update or create documentation covering the implementation — migration guide + README + final report consolidation
- [x] 2.2 Write tests covering the new behavior — tests/v6-cleanup.test.ts (3 tests) + tests/v7-budgets.test.ts (acceptance 3+5)
- [x] 2.3 Run tests and confirm they pass — full suite green
