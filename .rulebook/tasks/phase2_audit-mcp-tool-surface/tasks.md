## 1. Audit
- [ ] 1.1 Grep tests + skills + docs for every `rulebook_analysis_*`, `rulebook_evals_*`, `rulebook_blockers`, `rulebook_doctor_run`, `rulebook_indexer_status` invocation
- [ ] 1.2 Inspect memory history (or session logs) for real-world usage of each candidate
- [ ] 1.3 Produce `docs/mcp-audit.md` with one row per candidate (verdict: keep / remove / merge / deprecate, with justification)

## 2. Removal pass
- [ ] 2.1 Remove agreed-removed tool registrations from `src/mcp/rulebook-server.ts`
- [ ] 2.2 Delete underlying manager modules that become orphaned (e.g. `analysis-manager.ts` if no callers remain)
- [ ] 2.3 Update `.rulebook/specs/RULEBOOK_MCP.md` with the trimmed catalog and a `## REMOVED Requirements` section listing what went

## 3. Documentation
- [ ] 3.1 Update README / CHANGELOG with the removed tools
- [ ] 3.2 For tools that survive, add a one-line canonical use-case in `RULEBOOK_MCP.md`

## 4. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 4.1 Update or create documentation covering the implementation
- [ ] 4.2 Write tests covering the new behavior
- [ ] 4.3 Run tests and confirm they pass
