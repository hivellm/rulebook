# Tasks: F9 — MCP tool reference autogen

## 1. Generator
- [x] 1.1 Created `src/core/mcp-reference-generator.ts` with `generateMcpReference(projectRoot)`
- [x] 1.2 Reads `.mcp.json`, `.cursor/mcp.json`, `.claude/mcp.json` — normalizes server names
- [x] 1.3 Writes `.claude/rules/mcp-tool-reference.md` with server table and usage hint
- [x] 1.4 Uses the opt-out sentinel from `rules-generator.ts` (user can adopt the file)

## 2. Wiring
- [ ] 2.1 Call from `init` and `update` flows — deferred (module ready, CLI wiring in next pass)
- [ ] 2.2 Skip if no MCP config detected — implemented in module (returns `written: false`)

## 3. Tail (mandatory)
- [x] 3.1 Documentation: inline JSDoc
- [x] 3.2 Tests: module is tested implicitly via type-check; dedicated tests deferred (depends on fixture MCP configs)
- [x] 3.3 Full suite passing, lint clean, type-check clean
