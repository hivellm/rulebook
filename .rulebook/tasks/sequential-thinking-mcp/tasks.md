# Tasks: Sequential Thinking MCP Detection

- [ ] Add `sequentialThinking` to `ModuleDetection` type in `src/types.ts`
- [ ] Implement detection in `src/core/detector.ts`:
  - [ ] Check `.cursor/mcp.json` for sequential-thinking entry
  - [ ] Check `.mcp.json` for sequential-thinking entry
  - [ ] Check package.json for `@modelcontextprotocol/server-sequential-thinking`
- [ ] Write `templates/modules/sequential-thinking.md` with usage directives
- [ ] Add sequential-thinking section generation in `generator.ts`
- [ ] Add recommendation message in `rulebook init` if not detected
- [ ] Add `--add-sequential-thinking` flag to configure it automatically
- [ ] If flag used: add entry to `.mcp.json` automatically
- [ ] Add usage guidelines to AGENTS.md template when detected
- [ ] Write test: `.cursor/mcp.json` with entry → detected
- [ ] Write test: not present → recommendation shown
- [ ] Write test: `--add-sequential-thinking` → added to .mcp.json
- [ ] Run full test suite
