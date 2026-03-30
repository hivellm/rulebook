## 1. Implementation
- [x] 1.1 Bump package.json version to 4.0.0
- [x] 1.2 Update .claude-plugin/plugin.json and marketplace.json to 4.0.0
- [x] 1.3 Update version fallbacks in commands.ts and config-manager.ts
- [x] 1.4 Add v3 -> v4 migration logic in config-manager.ts (handle config changes)
- [x] 1.5 Update MCP server version in rulebook-server.ts

## 2. Testing
- [x] 2.1 Write test: v3 config migrates cleanly to v4 format
- [x] 2.2 Verify all version references are consistent

## 3. Documentation
- [x] 3.1 Write CHANGELOG.md entry for v4.0.0
- [x] 3.2 Update README.md with v4 features overview

## Status: ✅ COMPLETE

Version bump to 4.0.0 fully completed across all manifests and documentation. All version references synchronized and migration path from v3 validated.

**Verification:**
- ✅ package.json: version = "4.0.0"
- ✅ .claude-plugin/plugin.json: version = "4.0.0"
- ✅ .claude-plugin/marketplace.json: version = "4.0.0"
- ✅ marketplace.json (root): version = "4.0.0"
- ✅ src/mcp/rulebook-server.ts: version = "4.0.0"
- ✅ CHANGELOG.md created with v4.0.0 entry dated 2026-03-01
- ✅ README.md updated with v4.0.0 features
- ✅ All version consistency tests passing
