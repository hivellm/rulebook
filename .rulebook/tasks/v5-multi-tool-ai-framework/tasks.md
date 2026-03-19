# v5-multi-tool-ai-framework

## 0. Performance & Memory Fixes (CRITICAL — must ship before any new features)
- [x] 0.1 Cache `getDbSizeBytes()` result instead of calling `db.export()` on every check <!-- 89a0f44 -->
- [x] 0.2 Fix BackgroundIndexer `__trigger_batch__` fake path — use direct setTimeout <!-- 89a0f44 -->
- [x] 0.3 Fix HNSW orphan leak: query node IDs before delete, call `index.remove()` for each <!-- 89a0f44 -->
- [x] 0.4 Remove duplicate SIGTERM/SIGINT listeners in Ralph MCP tool <!-- 89a0f44 -->
- [x] 0.5 Replace sql.js (WASM) with better-sqlite3 (native) — zero-copy WAL writes, <5ms init, O(1) size check <!-- fd9851c -->
- [x] 0.6 Replace HNSW `searchLayer` array `.sort()` with MinHeap/MaxHeap priority queues <!-- 89a0f44 -->
- [x] 0.7 Fix BM25 FTS5 query safety — escape special chars, quote individual terms <!-- 89a0f44 -->
- [x] 0.8 Clamp `exportMemories` limit from 100,000 to 1,000 to prevent OOM <!-- 89a0f44 -->
- [x] 0.9 Move `checkAndEvict()` out of hot path — run every 50 saves, not on every save <!-- 89a0f44 -->
- [x] 0.10 Replace BackgroundIndexer `fs.watch` with chokidar — OS-level ignore, write stabilization <!-- a305c79 -->

## 1. Universal Templates
- [x] 1.1 Create `templates/core/TIER1_PROHIBITIONS.md` — 6 prohibitions (no-shortcuts, git-safety, no-delete, research-first, sequential-editing, no-deferred) <!-- d52e025 -->
- [x] 1.2 PLANS.md template already exists with CONTEXT/TASK/HISTORY sections — no changes needed
- [x] 1.3 Anti-deferred rule included as Prohibition 6 in TIER1_PROHIBITIONS.md <!-- d52e025 -->
- [x] 1.4 Create `templates/core/TOKEN_OPTIMIZATION.md` — model tier assignment + per-tier output rules <!-- d52e025 -->
- [x] 1.5 Update `GIT_WORKFLOW.md` with explicit allow-list and forbidden command table <!-- d52e025 -->
- [x] 1.6 Integrate Tier 1 + Token Optimization into generator — referenced first in AGENTS.md, generated as specs <!-- d52e025 -->

## 2. Canonical Rules System
- [x] 2.1 Define canonical rule format with frontmatter (name, tier, filePatterns, tools) <!-- ae26f91 -->
- [x] 2.2 Rule engine loads from `.rulebook/rules/` — `loadCanonicalRules()` <!-- ae26f91 -->
- [x] 2.3 Create rule template library: 7 rules (no-shortcuts, git-safety, sequential-editing, task-decomposition, research-first, incremental-tests, no-deferred) <!-- ae26f91 -->
- [x] 2.4 Rule projection: canonical → Claude Code `.claude/rules/<name>.md` <!-- ae26f91 -->
- [x] 2.5 Rule projection: canonical → Cursor `.cursor/rules/<name>.mdc` with YAML frontmatter <!-- ae26f91 -->
- [x] 2.6 Rule projection: canonical → Gemini `GEMINI.md` sections grouped by tier <!-- ae26f91 -->
- [x] 2.7 Rule projection: canonical → Copilot `.github/copilot-instructions.md` <!-- ae26f91 -->
- [x] 2.8 Rule projection: canonical → Windsurf `.windsurf/rules/<name>.md` + Continue.dev <!-- ae26f91 -->
- [x] 2.9 Add `rulebook rules list`, `rulebook rules add`, `rulebook rules project` CLI commands <!-- cf58fea -->
- [x] 2.10 Integrate rule projection into `rulebook update` flow — auto-projects to all detected tools <!-- cf58fea -->

## 3. Adaptive Agent Framework
- [x] 3.1 Define agent template format with frontmatter (domain, filePatterns, tier, model, checklist) + multi-line YAML list parser <!-- d6e60ac -->
- [x] 3.2 Create agent templates for game-engine: shader-engineer, cpp-core-expert, render-engineer, systems-integration (4 agents) <!-- d6e60ac -->
- [x] 3.3 Create agent templates for compiler: codegen-debugger, stdlib-engineer, test-coverage-guardian (3 agents) <!-- d6e60ac -->
- [x] 3.4 Create agent templates for web-app: frontend-engineer, backend-engineer, api-designer, database-engineer, security-reviewer (5 agents) <!-- d6e60ac -->
- [x] 3.5 Create agent templates for mobile: platform-specialist, ui-engineer (2 agents) <!-- d6e60ac -->
- [x] 3.6 Implement agent generation for Claude Code (`.claude/agents/*.md` + memory dirs + MEMORY.md) <!-- d6e60ac -->
- [x] 3.7 Implement graceful degradation for Cursor (agents → contextual `agent-<name>.mdc` rules with globs) <!-- d6e60ac -->
- [x] 3.8 Implement graceful degradation for Gemini/Codex (agents → inline "When Editing" sections) <!-- d6e60ac -->
- [x] 3.9 Add mandatory section injection: no-shortcuts, update-tasks, no-deferred, research-first + pre-flight checklists <!-- d6e60ac -->
- [x] 3.10 Model tier labels (core/standard/research) mapped to model names in templates <!-- d6e60ac -->
- [ ] 3.11 Add `agentFramework` config section to `.rulebook` schema

## 4. Tool Detection & Multi-Tool Generation
- [x] 4.1 Tool detection already existed in detector.ts (Claude Code, Cursor, Gemini, Codex, Windsurf, Continue.dev, Copilot) <!-- pre-existing -->
- [ ] 4.2 Add `--tools` flag to `rulebook init` and `rulebook update`
- [x] 4.3 Tool-specific file generation via multi-tool-generator.ts + cursor-mdc-generator.ts <!-- pre-existing -->
- [x] 4.4 Rule projection integrated into `rulebook update` — projects to ALL detected tools <!-- cf58fea -->
- [x] 4.5 Tool detection indicators already in detector.ts <!-- pre-existing -->

## 5. Cross-Tool Memory & Sessions
- [x] 5.1 Add `rulebook_session_start` MCP tool — loads PLANS.md + searches memories <!-- af5a758 -->
- [x] 5.2 Add `rulebook_session_end` MCP tool — saves summary to PLANS.md + memory <!-- af5a758 -->
- [x] 5.3 Add `rulebook_rules_list` MCP tool — lists canonical rules with tier info <!-- af5a758 -->
- [x] 5.4 Session CLI via existing `rulebook plans` commands (show/init/clear) <!-- pre-existing -->
- [x] 5.5 Session end via `rulebook_session_end` MCP tool <!-- af5a758 -->
- [ ] 5.6 Generate session workflow directive in all tool-specific files

## 6. Enhanced Task Management
- [x] 6.1 Add `getTaskMetadata()` supporting blocks/blockedBy/cascadeImpact <!-- af5a758 -->
- [x] 6.2 Implement blocker chain in `rulebook_blockers` MCP tool — traverses metadata <!-- af5a758 -->
- [x] 6.3 Add `rulebook task blockers` CLI command — sorted by cascade impact <!-- af5a758 -->
- [x] 6.4 Add `rulebook_blockers` MCP tool <!-- af5a758 -->
- [ ] 6.5 Add `rulebook task blocked-by <id>` CLI command
- [x] 6.6 Anti-deferred enforced via Tier 1 prohibition in TIER1_PROHIBITIONS.md <!-- d52e025 -->

## 7. Project Complexity Detection
- [x] 7.1 Implement complexity scoring (LOC sampling, languages, source dirs, build targets, MCP) <!-- 10df8ae -->
- [x] 7.2 Define complexity tiers (small/medium/large/complex) with recommendation profiles <!-- 10df8ae -->
- [x] 7.3 Add `rulebook assess` CLI command — tested on rulebook (LARGE, 58K LOC) <!-- 10df8ae -->
- [ ] 7.4 Implement calibrated generation per complexity tier
- [ ] 7.5 Add `referenceSource` config for reference implementation workflows

## 8. Testing & Documentation
- [x] 8.1 Unit tests for rule projection engine — 22 tests in rule-engine.test.ts <!-- ae26f91 -->
- [x] 8.2 Unit tests for tool detection — pre-existing in multi-tool-detection.test.ts <!-- pre-existing -->
- [x] 8.3 Unit tests for agent template generation — 15 tests in agent-template-engine.test.ts <!-- d6e60ac -->
- [ ] 8.4 Unit tests for complexity detection and tier scoring
- [ ] 8.5 Unit tests for task dependency graph and blocker chain
- [ ] 8.6 Unit tests for session management MCP tools
- [ ] 8.7 Integration tests for multi-tool `rulebook init --tools` flow
- [ ] 8.8 Update CHANGELOG.md with v5.0.0 entry
- [ ] 8.9 Update README.md with multi-tool documentation
- [ ] 8.10 Update docs/ with v5 architecture guide
