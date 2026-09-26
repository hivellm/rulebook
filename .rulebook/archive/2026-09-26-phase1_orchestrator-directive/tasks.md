## 1. Implementation
- [x] 1.1 Replace the `## Orchestration` section in `templates/core/claude-md.md` with the compact v7.4 directive + spec pointer (context budget must still pass)
- [x] 1.2 Replace rule 9 in `templates/core/agents-lean.md` and add `orchestration.md` to the specs index
- [x] 1.3 Create `templates/core/orchestration.md` (ORCHESTRATION:START/END) with the full protocol
- [x] 1.4 Generate `.rulebook/specs/orchestration.md` unconditionally in `generateModularAgents`; check tests/migration code for hard-coded spec lists
- [x] 1.5 Update this repo's `CLAUDE.md` and create `.rulebook/specs/orchestration.md` from the templates
- [x] 1.6 Update README "Multi-Agent Workflows" (and the "never mandated" line) for the v7.4 orchestrator model
- [x] 1.7 Align `AGENT_REGISTRY` models in `generator.ts` with v7.4 routing (architect/code-reviewer/security-reviewer → fable; implementer/tester/docs-writer/build-engineer/performance-engineer/team-lead → opus; researcher → haiku) and the README workflow/model mentions (Opus implements, Fable reviews)
- [x] 1.8 Rewrite the context-budget P0 orchestration test for the v7.4 policy (directive present, no hook denies or reroutes agent calls)

## 2. Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass
