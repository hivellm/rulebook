## 1. Implementation
- [ ] 1.1 Audit `MemoryManager` constructor to trace actual dbPath resolution with npx
- [ ] 1.2 Fix projectRoot resolution in MCP server to use `findRulebookConfig` parent dir consistently
- [ ] 1.3 Ensure `memory-store.ts` creates parent directories before writing db file
- [ ] 1.4 Add `.rulebook/memory/` directory scaffolding to `init` command
- [ ] 1.5 Add `memory verify` CLI subcommand to check db location and health
- [ ] 1.6 Add startup log (stderr) in MCP server showing resolved memory db path

## 2. Testing
- [ ] 2.1 Write test: memory.db created at `.rulebook/memory/memory.db` relative to project root
- [ ] 2.2 Write test: npx execution resolves correct project root
- [ ] 2.3 Write test: memory persists across MCP server restarts
- [ ] 2.4 Write test: `memory verify` command reports correct status

## 3. Documentation
- [ ] 3.1 Update memory section in CLAUDE.md with troubleshooting
- [ ] 3.2 Update CHANGELOG for v4.0.0
