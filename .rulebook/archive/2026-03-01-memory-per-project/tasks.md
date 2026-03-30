## 1. Implementation
- [x] 1.1 Audit `MemoryManager` constructor to trace actual dbPath resolution with npx
- [x] 1.2 Fix projectRoot resolution in MCP server to use `findRulebookConfig` parent dir consistently
- [x] 1.3 Ensure `memory-store.ts` creates parent directories before writing db file
- [x] 1.4 Add `.rulebook/memory/` directory scaffolding to `init` command
- [x] 1.5 Add `memory verify` CLI subcommand to check db location and health
- [x] 1.6 Add startup log (stderr) in MCP server showing resolved memory db path

## 2. Testing
- [x] 2.1 Write test: memory.db created at `.rulebook/memory/memory.db` relative to project root
- [x] 2.2 Write test: npx execution resolves correct project root
- [x] 2.3 Write test: memory persists across MCP server restarts
- [x] 2.4 Write test: `memory verify` command reports correct status

## 3. Documentation
- [x] 3.1 Update memory section in CLAUDE.md with troubleshooting
- [x] 3.2 Update CHANGELOG for v4.0.0

## Status: ✅ COMPLETE

Memory per-project persistence fully implemented and tested. Memory database now persists reliably with guaranteed per-project isolation, correct path resolution for npx execution, and diagnostic tools.

**Verification:**
- ✅ `saveToDisk()` forced after `initialize()` in memory-store.ts
- ✅ Memory DB path logged to stderr in MCP server (line 650)
- ✅ `rulebook memory verify` command implemented and registered
- ✅ `.rulebook/memory/` directory ensured during init
- ✅ 7 tests passing in memory-per-project.test.ts
- ✅ Persistence verified across restarts
- ✅ Per-project isolation confirmed
