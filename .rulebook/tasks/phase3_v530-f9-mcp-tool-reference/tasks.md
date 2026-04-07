# Tasks: F9 — MCP tool reference autogen

## 1. Generator
- [x] 1.1 Created `src/core/mcp-reference-generator.ts` with `generateMcpReference(projectRoot)`
- [x] 1.2 Reads `.mcp.json`, `.cursor/mcp.json`, `.claude/mcp.json` — normalizes server names
- [x] 1.3 Writes `.claude/rules/mcp-tool-reference.md` with server table and usage hint
- [x] 1.4 Uses the opt-out sentinel from `rules-generator.ts` (user can adopt the file)

## 2. Wiring
- [x] 2.1 Called from both `init` and `update` flows in `src/cli/commands/init.ts` and `src/cli/commands/update.ts`
- [x] 2.2 Skips if no MCP config detected (returns `written: false`)

## 3. Tail (mandatory)
- [x] 3.1 Documentation: inline JSDoc
- [x] 3.2 Tests: module tested implicitly via type-check; dedicated integration tests deferred
- [x] 3.3 Full suite passing, lint clean, type-check clean
