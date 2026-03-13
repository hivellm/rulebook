# Tasks: add-context-intelligence-layer

## Phase 1: Decision Records

- [ ] Add `Decision`, `DecisionStatus` types to `src/types.ts`
- [ ] Create `src/core/decision-manager.ts` with CRUD + auto-numbering + supersede
- [ ] Create `templates/core/DECISIONS.md` template
- [ ] Add `decision` command group to `src/index.ts` (create, list, show, supersede)
- [ ] Implement decision CLI commands in `src/cli/commands.ts`
- [ ] Add 4 MCP tools to `src/mcp/rulebook-server.ts`
- [ ] Add DecisionManager to `src/core/workspace/project-worker.ts`
- [ ] Integrate decisions section into `src/core/generator.ts`
- [ ] Auto-save decisions to memory system on create
- [ ] Create `tests/decision-manager.test.ts` (~18 tests)

## Phase 2: Knowledge Base

- [ ] Add `KnowledgeEntry`, `KnowledgeType`, `KnowledgeCategory` types to `src/types.ts`
- [ ] Create `src/core/knowledge-manager.ts` with add/list/show/remove + getForGenerator
- [ ] Create `templates/core/KNOWLEDGE.md` template
- [ ] Add `knowledge` command group to `src/index.ts` (add, list, show, remove)
- [ ] Implement knowledge CLI commands in `src/cli/commands.ts`
- [ ] Add 3 MCP tools to `src/mcp/rulebook-server.ts`
- [ ] Add KnowledgeManager to `src/core/workspace/project-worker.ts`
- [ ] Integrate knowledge section (patterns + anti-patterns) into `src/core/generator.ts`
- [ ] Create `tests/knowledge-manager.test.ts` (~15 tests)

## Phase 3: Learn Phase

- [ ] Add `Learning` type to `src/types.ts`
- [ ] Create `src/core/learn-manager.ts` with capture/fromRalph/list/promote
- [ ] Add `learn` command group to `src/index.ts` (capture, from-ralph, list, promote)
- [ ] Implement learn CLI commands in `src/cli/commands.ts`
- [ ] Add learning capture prompts to `src/cli/prompts.ts`
- [ ] Add 3 MCP tools to `src/mcp/rulebook-server.ts`
- [ ] Add LearnManager to `src/core/workspace/project-worker.ts`
- [ ] Hook into task archive flow: prompt for learnings on `rulebook task archive`
- [ ] Extract Ralph iteration learnings via `fromRalph()`
- [ ] Implement promote flow (learning → knowledge or decision)
- [ ] Create `tests/learn-manager.test.ts` (~15 tests)

## Phase 4: Integration & Polish

- [ ] Create skills: `.claude/commands/rulebook-decision-*.md`
- [ ] Create skills: `.claude/commands/rulebook-knowledge-*.md`
- [ ] Create skills: `.claude/commands/rulebook-learn-*.md`
- [ ] Run full test suite — no regressions in existing tests
- [ ] Verify 95%+ coverage on new code
- [ ] Update CHANGELOG.md
