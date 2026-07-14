## 1. Implementation
- [ ] 1.1 Implement `rulebook update` v6→v7 path: lean rewrite of CLAUDE.md/AGENTS.md preserving AGENTS.override.md
- [ ] 1.2 Strip all retired v6 hook entries via the signature mechanism and remove rulebook-owned retired files
- [ ] 1.3 Migrate `.mcp.json` to the slim server entrypoint during update
- [ ] 1.4 Add `--dry-run` with a full diff summary before any write
- [ ] 1.5 Add CI acceptance checks: token budget, hook audit, MCP schema budget, orchestration-freedom fixture (P0), startup benchmark
- [ ] 1.6 Write the v6→v7 migration guide in /docs with measured before/after numbers
- [ ] 1.7 Update README and CHANGELOG for the 7.0.0 release
- [ ] 1.8 Consolidate the impact ledger (05-budget-and-metrics.md) into the final v7 performance report with per-change deltas vs the v6 baseline

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass
