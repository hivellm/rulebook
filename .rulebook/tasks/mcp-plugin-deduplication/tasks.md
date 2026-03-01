## 1. Implementation
- [ ] 1.1 Add `--project-root <path>` CLI flag to MCP server for explicit project targeting
- [ ] 1.2 Update `loadConfig()` in rulebook-server.ts to use `--project-root` when provided
- [ ] 1.3 Refactor `configureMcpJson()` to detect and remove duplicate rulebook entries
- [ ] 1.4 Add project-root argument to MCP server args in `.mcp.json` registration
- [ ] 1.5 Add cleanup of stale/orphan MCP entries during `init` and `update`
- [ ] 1.6 Ensure `npx` invocation passes correct project root context

## 2. Testing
- [ ] 2.1 Write tests for deduplication logic in claude-mcp.ts
- [ ] 2.2 Write tests for `--project-root` flag in MCP server
- [ ] 2.3 Test multi-project scenario (two projects with rulebook installed)

## 3. Documentation
- [ ] 3.1 Update MCP setup documentation with deduplication behavior
- [ ] 3.2 Update CHANGELOG for v4.0.0
