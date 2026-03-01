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

## Gotchas
- Linter/other agents may modify files concurrently - always re-read before editing after a failed write
- The `ClaudeCodeSetupResult` interface was extended in multi-agent-directives task (agentTeamsEnabled, agentDefinitionsInstalled)
- Pre-existing test failure in `claude-plugin.test.ts` — version mismatch (expects 4.0.0, files still 3.4.2) — belongs to version-bump-v4 task
