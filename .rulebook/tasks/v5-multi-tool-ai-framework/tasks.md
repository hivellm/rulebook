# v5-multi-tool-ai-framework

## 0. Performance & Memory Fixes (CRITICAL — must ship before any new features)
- [ ] 0.1 Cache `getDbSizeBytes()` result instead of calling `db.export()` on every check (memory-store.ts:476-478)
- [ ] 0.2 Fix BackgroundIndexer: replace `fs.watch` recursive with chokidar, fix `__trigger_batch__` fake path (background-indexer.ts:52-66,174)
- [ ] 0.3 Fix HNSW orphan leak: call `index.remove()` in `deleteCodeNodesByFile` (memory-manager.ts:311-317)
- [ ] 0.4 Remove duplicate SIGTERM/SIGINT listeners in Ralph MCP tool (rulebook-server.ts:1233-1237)
- [ ] 0.5 Replace sql.js (WASM) with better-sqlite3 (native) to eliminate full-DB export() copies
- [ ] 0.6 Replace HNSW `searchLayer` array `.sort()` with priority queue (hnsw-index.ts:99-138)
- [ ] 0.7 Fix BM25 SQL string interpolation — use parameterized queries (memory-store.ts:278-291)
- [ ] 0.8 Clamp `exportMemories` limit to safe max (1000) to prevent OOM (memory-manager.ts:270)
- [ ] 0.9 Move `checkAndEvict()` out of hot path — call periodically, not on every `saveMemory()`

## 1. Universal Templates
- [ ] 1.1 Create `templates/core/TIER1_PROHIBITIONS.md` (no-shortcuts, git-safety, no-delete, sequential-editing, research-first)
- [ ] 1.2 Create structured `PLANS.md` template with CONTEXT/TASK/HISTORY sections
- [ ] 1.3 Create anti-deferred rule template
- [ ] 1.4 Create token optimization templates per model tier (core/standard/research)
- [ ] 1.5 Update `GIT.md` template with explicit allow-list and forbidden list
- [ ] 1.6 Integrate Tier 1 prohibitions into generator output (AGENTS.md, CLAUDE.md)

## 2. Canonical Rules System
- [ ] 2.1 Define canonical rule format with frontmatter (name, tier, filePatterns, tools)
- [ ] 2.2 Add `.rulebook/rules/` directory support in config-manager
- [ ] 2.3 Create rule template library (no-shortcuts, git-safety, sequential-editing, task-decomposition, research-first, incremental-tests, no-deferred)
- [ ] 2.4 Implement rule projection engine: canonical → Claude Code `.claude/rules/`
- [ ] 2.5 Implement rule projection: canonical → Cursor `.cursor/rules/*.mdc`
- [ ] 2.6 Implement rule projection: canonical → Gemini `GEMINI.md` sections
- [ ] 2.7 Implement rule projection: canonical → Copilot `.github/copilot-instructions.md`
- [ ] 2.8 Implement rule projection: canonical → Windsurf `.windsurf/rules/`
- [ ] 2.9 Add `rulebook rules list` CLI command
- [ ] 2.10 Add `rulebook rules add <name>` CLI command

## 3. Adaptive Agent Framework
- [ ] 3.1 Define agent template format (domain, filePatterns, tier, checklist)
- [ ] 3.2 Create agent templates for game-engine project type (8-12 agents)
- [ ] 3.3 Create agent templates for compiler/language project type (6-8 agents)
- [ ] 3.4 Create agent templates for web-app project type (6-8 agents)
- [ ] 3.5 Create agent templates for mobile project type (4-6 agents)
- [ ] 3.6 Implement agent generation for Claude Code (`.claude/agents/*.md` + memory dirs)
- [ ] 3.7 Implement graceful degradation for Cursor (agents → contextual `.mdc` rules)
- [ ] 3.8 Implement graceful degradation for Gemini/Codex (agents → inline sections)
- [ ] 3.9 Add mandatory section injection into all agent/rule definitions
- [ ] 3.10 Add model tier assignment config (core/standard/research labels)
- [ ] 3.11 Add `agentFramework` config section to `.rulebook` schema

## 4. Tool Detection & Multi-Tool Generation
- [ ] 4.1 Add tool detection in detector.ts (Claude Code, Cursor, Gemini, Codex, Windsurf, Continue.dev, Copilot)
- [ ] 4.2 Add `--tools` flag to `rulebook init` and `rulebook update`
- [ ] 4.3 Generate tool-specific directives files per detected tool
- [ ] 4.4 Ensure `rulebook update` updates ALL detected tools simultaneously
- [ ] 4.5 Add tool detection indicators (.claude/, .cursor/, GEMINI.md, .github/copilot-instructions.md, .windsurf/)

## 5. Cross-Tool Memory & Sessions
- [ ] 5.1 Add `rulebook_session_start` MCP tool
- [ ] 5.2 Add `rulebook_session_end` MCP tool
- [ ] 5.3 Add `rulebook_rules_list` MCP tool
- [ ] 5.4 Add `rulebook session start` CLI command
- [ ] 5.5 Add `rulebook session end` CLI command
- [ ] 5.6 Generate session workflow directive in all tool-specific files

## 6. Enhanced Task Management
- [ ] 6.1 Add `blocks`/`blockedBy`/`cascadeImpact` to task metadata schema
- [ ] 6.2 Implement blocker chain calculation (dependency graph traversal)
- [ ] 6.3 Add `rulebook task blockers` CLI command
- [ ] 6.4 Add `rulebook_blockers` MCP tool
- [ ] 6.5 Add `rulebook task blocked-by <id>` CLI command
- [ ] 6.6 Enforce anti-deferred: reject "deferred" status, require "blocked" with reference

## 7. Project Complexity Detection
- [ ] 7.1 Implement complexity scoring (LOC, languages, source dirs, build targets)
- [ ] 7.2 Define complexity tiers (small/medium/large/complex) with generation profiles
- [ ] 7.3 Add `rulebook assess` CLI command
- [ ] 7.4 Implement calibrated generation per complexity tier
- [ ] 7.5 Add `referenceSource` config for reference implementation workflows

## 8. Testing & Documentation
- [ ] 8.1 Unit tests for rule projection engine (canonical → each tool format)
- [ ] 8.2 Unit tests for tool detection
- [ ] 8.3 Unit tests for agent template generation with graceful degradation
- [ ] 8.4 Unit tests for complexity detection and tier scoring
- [ ] 8.5 Unit tests for task dependency graph and blocker chain
- [ ] 8.6 Unit tests for session management MCP tools
- [ ] 8.7 Integration tests for multi-tool `rulebook init --tools` flow
- [ ] 8.8 Update CHANGELOG.md with v5.0.0 entry
- [ ] 8.9 Update README.md with multi-tool documentation
- [ ] 8.10 Update docs/ with v5 architecture guide
