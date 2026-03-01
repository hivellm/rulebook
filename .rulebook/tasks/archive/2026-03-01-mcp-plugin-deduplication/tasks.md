## 1. Implementation
- [x] 1.1 Add `--project-root <path>` CLI flag to MCP server for explicit project targeting
- [x] 1.2 Update `loadConfig()` in rulebook-server.ts to use `--project-root` when provided
- [x] 1.3 Refactor `configureMcpJson()` to detect and remove duplicate rulebook entries
- [x] 1.4 Add project-root argument to MCP server args in `.mcp.json` registration
- [x] 1.5 Add cleanup of stale/orphan MCP entries during `init` and `update`
- [x] 1.6 Ensure `npx` invocation passes correct project root context

## 2. Testing
- [x] 2.1 Write tests for deduplication logic in claude-mcp.ts
- [x] 2.2 Write tests for `--project-root` flag in MCP server
- [x] 2.3 Test multi-project scenario (two projects with rulebook installed)

## 3. Documentation
- [x] 3.1 Update MCP setup documentation with deduplication behavior
- [x] 3.2 Update CHANGELOG for v4.0.0

## Status: ✅ COMPLETE

MCP plugin deduplication fully implemented. When multiple projects use Rulebook, only one MCP entry is registered per workspace with correct project context via `--project-root` flag.

**Verification:**
- ✅ `configureMcpJson()` in claude-mcp.ts adds `--project-root` to MCP args
- ✅ `loadConfig()` in rulebook-server.ts reads and uses `--project-root` flag
- ✅ Duplicate entries are prevented through smart update logic
- ✅ Legacy entries without `--project-root` automatically upgraded
- ✅ 24 tests passing in claude-mcp-setup.test.ts covering all scenarios
- ✅ Multi-project deduplication validated
