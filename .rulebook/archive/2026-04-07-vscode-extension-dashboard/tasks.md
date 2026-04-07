## 1. Extension Scaffolding
- [x] 1.1 VSCode extension project initialized (`vscode-extension/`)
- [x] 1.2 `package.json` configured with activation events, commands, views
- [x] 1.3 TypeScript build pipeline with esbuild for bundling
- [x] 1.4 Activity Bar icon and Webview Panel provider registered

## 2. MCP Client Integration
- [x] 2.1 `RulebookClient` created (`src/services/rulebook-client.ts`)
- [x] 2.2 Polling implemented for real-time status updates
- [x] 2.3 Typed wrappers for task, memory, agent, indexer tools
- [x] 2.4 Added v5.3.0 methods: `listAnalyses()`, `runDoctor()`, `getContextUsage()`, `getTelemetryStats()`

## 3. Webview Dashboard UI
- [x] 3.1 Main dashboard HTML/CSS/JS with tab navigation
- [x] 3.2 Tasks tab — list tasks, show progress, archive
- [x] 3.3 Agents tab — show active teams, members, activity, stop button
- [x] 3.4 Indexer tab — status, DB availability
- [x] 3.5 Memory tab — search + stats with real SQLite counts via `better-sqlite3` (was showing 0, now queries `SELECT COUNT(*)`)
- [x] 3.6 Removed Ralph tab (was non-functional)
- [x] 3.7 Analysis tab — list analyses from `docs/analysis/`, create new analysis via input box
- [x] 3.8 Doctor tab — inline health checks with pass/warn/fail badges, run button

## 4. Status Bar Integration
- [x] 4.1 Status bar items created
- [x] 4.2 Shows active agents count, indexer status
- [x] 4.3 Removed non-functional Ralph status bar item
- [x] 4.4 Context usage indicator — estimates context % from JSONL transcript, shows block bar with green/yellow/red color thresholds

## 5. Session Handoff Integration (v5.3.0 F-NEW-5)
- [x] 5.1 `triggerHandoff` command finds Claude Code terminal and sends `/handoff` via `terminal.sendText`

## 6. Commands & Keybindings
- [x] 6.1 Commands: openDashboard, refreshDashboard, reindexCodebase, clearMemory
- [x] 6.2 Added: runDoctor, createAnalysis (with input box), triggerHandoff
- [x] 6.3 All commands registered in package.json contributes.commands

## 7. Telemetry Dashboard (v5.3.0 F10)
- [x] 7.1 Reads `.rulebook/telemetry/*.ndjson` and aggregates per-tool stats
- [x] 7.2 Shows total calls + per-tool: call count, avg latency, error rate

## 8. Packaging & Release
- [x] 8.1 Previous: v0.5.0, v0.6.0
- [x] 8.2 Bumped to v0.7.0 with v5.3.0 integrations + bug fixes
- [x] 8.3 `--external:better-sqlite3` added to esbuild for native module support

## 9. Tail (mandatory)
- [x] 9.1 Update or create documentation covering the implementation
- [x] 9.2 Write tests covering the new behavior
- [x] 9.3 Run tests and confirm they pass
