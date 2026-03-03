## 1. Extension Scaffolding
- [ ] 1.1 Initialize VSCode extension project with `yo code` or manual setup
- [ ] 1.2 Configure `package.json` with activation events, commands, views
- [ ] 1.3 Set up TypeScript build pipeline with esbuild for bundling
- [ ] 1.4 Register Activity Bar icon and Webview Panel provider

## 2. MCP Client Integration
- [ ] 2.1 Create MCP client that connects to the Rulebook MCP server
- [ ] 2.2 Implement polling/subscription for real-time status updates
- [ ] 2.3 Create typed wrappers for all Rulebook MCP tools

## 3. Webview Dashboard UI
- [ ] 3.1 Create the main dashboard HTML/CSS/JS with tab navigation
- [ ] 3.2 Task Dashboard tab — list tasks, show progress, create/archive buttons
- [ ] 3.3 Agent Monitor tab — show active agents and status
- [ ] 3.4 Ralph tab — loop status, iterations, quality gates, pause/resume
- [ ] 3.5 Memory Explorer tab — search, browse, delete memories
- [ ] 3.6 Indexer tab — status, files processed, reindex button

## 4. Status Bar Integration
- [ ] 4.1 Create status bar items for quick status indicators
- [ ] 4.2 Show active agents count, indexer status, Ralph state

## 5. Commands & Keybindings
- [ ] 5.1 Register commands: open dashboard, refresh, reindex, etc.
- [ ] 5.2 Add keyboard shortcuts for common actions

## 6. Testing & Polish
- [ ] 6.1 Test extension activation and deactivation
- [ ] 6.2 Test MCP connection lifecycle
- [ ] 6.3 Package extension as .vsix
- [ ] 6.4 Write README for the extension
