# TypeScript Implementer Memory

## Project Structure
- CLI entry: `src/index.ts`, commands: `src/cli/commands.ts`
- Core logic: `src/core/` (detector, generator, task-manager, claude-mcp, etc.)
- MCP server: `src/mcp/rulebook-server.ts`
- Utils: `src/utils/file-system.ts` (readFile, writeFile, fileExists, ensureDir)
- Tests: `tests/` using Vitest

## Key Patterns
- File I/O uses custom wrappers from `src/utils/file-system.ts` (not raw fs)
- MCP server reads config via `findRulebookConfig()` which walks up directories
- `loadConfig()` in rulebook-server.ts reads `process.argv` for flags like `--project-root`
- `configureMcpJson()` writes to `<projectRoot>/.mcp.json` with key "rulebook"
- Tests use real temp directories (fs.mkdtemp) not mocks for claude-mcp tests

## Conventions
- Interface `ClaudeCodeSetupResult` lives in `src/core/claude-mcp.ts` (not types.ts)
- MCP server args: `['-y', '@hivehub/rulebook@latest', 'mcp-server', '--project-root', projectRoot]`
- Tests in `tests/claude-mcp-setup.test.ts` cover configureMcpJson, installClaudeCodeSkills, setupClaudeCodeIntegration

## Templates Pattern
- Templates dir resolution: Each module uses local `getTemplatesDir()` via `path.join(__dirname, '..', '..', 'templates')` (not centralized)
- ESM: All `.js` extensions in imports. Uses `import.meta.url` + `fileURLToPath` for `__dirname`
- CLI integration: Dynamic imports with `try/catch` for optional features
- No chmod in codebase (Windows-first). Only apply on non-win32 platforms

## Files Created (ralph-shell-scripts task)
- `src/core/ralph-scripts.ts` — `installRalphScripts(projectRoot): Promise<string[]>`
- `templates/ralph/ralph-{init,run,status,pause,history}.{sh,bat}` — 10 template files
- `tests/ralph-scripts.test.ts` — 9 tests (all passing)
- `src/cli/commands.ts` — Hooked into init (~line 409) and update (~line 1712)

## Memory System
- `MemoryStore` in `src/memory/memory-store.ts` uses sql.js (WASM SQLite)
- `initialize()` now forces `saveToDisk()` to guarantee .db exists on disk immediately
- `AUTO_SAVE_THRESHOLD = 50` — without the fix, DB only persisted after 50 writes or close()
- Default DB path: `.rulebook/memory/memory.db`
- MCP server logs memory DB path to stderr for diagnostics
- `memoryVerifyCommand()` in commands.ts: diagnostic CLI for memory state
- `MemoryManager` in `src/memory/memory-manager.ts` orchestrates store + HNSW + search + cache
- Config type: `MemoryConfig` in `src/memory/memory-types.ts` (also in `RulebookConfig.memory`)

## Multi-Agent Directives (v4.0.0)
- `templates/core/MULTI_AGENT.md` — core template for multi-agent coordination rules
- `templates/agents/{team-lead,researcher,implementer,tester}.md` — agent definition templates with YAML frontmatter
- `configureClaudeSettings(projectRoot)` — sets `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.json`
- `installAgentDefinitions(projectRoot, templatesPath)` — copies `templates/agents/*.md` to `.claude/agents/`
- `ClaudeCodeSetupResult` now includes `agentTeamsEnabled: boolean` and `agentDefinitionsInstalled: string[]`
- Generator adds MULTI_AGENT reference in `generateModularAgents()` alongside AGENT_AUTOMATION (non-minimal mode)

## Health Scorer v2 (health-scorer-v2 task)
- `HealthScore` interface extended: `grade`, `breakdown`, new categories (`agentsMd`, `ralph`, `memory`)
- Breakdown sub-interfaces: `AgentsMdQualityBreakdown`, `ReadmeQualityBreakdown`, `RalphProgressBreakdown`, `MemoryActivityBreakdown`
- 4 new measure functions: `measureAgentsMdQuality`, `measureReadmeQuality`, `measureRalphQuality`, `measureMemoryActivity`
- Updated weights: doc 0.15, testing 0.20, quality 0.10, security 0.10, cicd 0.10, deps 0.10, agentsMd 0.10, ralph 0.10, memory 0.05
- `calculateHealthScore()` now includes `grade` computed via `getHealthGrade(overall)`
- `commands.ts` healthCommand uses `health.grade` directly (no longer imports `getHealthGrade`)
- Recommendations text no longer has emoji prefixes (stripped for cleaner output)
- Uses `fsPromises.stat()` for memory DB file size estimation (recordCount = size / 500)
- Tests: 20 tests total (6 getHealthGrade + 14 calculateHealthScore), all passing

## Multi-Tool Config Generation (v4.0.0)
- `src/core/multi-tool-generator.ts` — generates IDE config files for Gemini CLI, Continue.dev, Windsurf, GitHub Copilot
- 4 detection functions in `src/core/detector.ts`: `detectGeminiCli`, `detectContinueDev`, `detectWindsurf`, `detectGithubCopilot`
- `DetectionResult` in `src/types.ts` extended with `geminiCli?`, `continueDev?`, `windsurf?`, `githubCopilot?`
- Templates: `templates/ides/{GEMINI_RULES,CONTINUE_RULES,WINDSURF_RULES,COPILOT_INSTRUCTIONS}.md`
- Idempotent write pattern: skip user-owned files (no RULEBOOK marker), update marker-managed files
- Wired into `generateModularAgents()` in generator.ts (after cursor MDC block)
- CLI feedback in commands.ts init (line ~380) and update (line ~1738) commands
- Tests: `tests/multi-tool-detection.test.ts` — 15 tests (detection + generation + idempotency)

## Ralph Parallel Execution (v4.0.0)
- `src/core/ralph-parallel.ts` — 4 pure functions: `analyzeDependencies`, `partitionForParallel`, `detectFileConflicts`, `buildParallelBatches`
- `ParallelRalphConfig` type in `src/types.ts`: `{ enabled: boolean; maxWorkers: number }`
- Added to `RulebookConfig.ralph.parallel` with defaults `{ enabled: false, maxWorkers: 3 }`
- `RalphManager.getParallelBatches(maxWorkers)` — loads PRD, filters pending, delegates to `buildParallelBatches`
- CLI: `ralph run --parallel <n>` in `src/index.ts`, handled in `ralphRunCommand` in `commands.ts`
- Parallel branch in `ralphRunCommand` uses `Promise.allSettled()` per batch, falls back to sequential when `--parallel` not set
- Config migration in `config-manager.ts` adds `ralph.parallel` if missing
- Tests: `tests/ralph-parallel.test.ts` — 24 tests (all passing), covers deps, batching, file conflicts, orchestration

## Ralph Plan Checkpoint (v4.0.0)
- `src/core/ralph-plan-checkpoint.ts` — 5 exports: `buildPlanPrompt`, `generateIterationPlan`, `displayPlan`, `requestPlanApproval`, `shouldRunCheckpoint`
- `PlanCheckpointConfig` type in `src/types.ts`: `{ enabled, autoApproveAfterSeconds, requireApprovalForStories }`
- Added to `RulebookConfig.ralph.planCheckpoint` with defaults `{ enabled: false, autoApproveAfterSeconds: 0, requireApprovalForStories: 'all' }`
- `RalphManager.runCheckpoint(story, tool, config)` — dynamic import of checkpoint module, returns `{ proceed, feedback? }`
- CLI: `ralph run --plan-first` in `src/index.ts`, wired into sequential loop in `commands.ts` (before AI agent execution)
- `ExecAsyncFn` type exported for DI in tests — avoids mocking `child_process` at module level
- Config migration in `config-manager.ts` adds `ralph.planCheckpoint` if missing
- Tests: `tests/ralph-plan-checkpoint.test.ts` — 15 tests (all passing)
- Windows gotcha: `echo '...' | nonexistent_cmd` doesn't fail on Windows — echo succeeds. Use DI for exec in tests instead of vi.doMock

## Gotchas
- Linter/other agents may modify files concurrently - always re-read before editing after a failed write
- The `ClaudeCodeSetupResult` interface was extended in multi-agent-directives task (agentTeamsEnabled, agentDefinitionsInstalled)
- Pre-existing test failure in `claude-plugin.test.ts` — version mismatch (expects 4.0.0, files still 3.4.2) — belongs to version-bump-v4 task
