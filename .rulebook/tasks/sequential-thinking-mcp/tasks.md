# Tasks: Sequential Thinking MCP Detection

- [x] Add `sequential_thinking` to `ModuleDetection` type in `src/types.ts`
- [x] Implement detection in `src/core/detector.ts`:
  - [x] Check `.cursor/mcp.json` for sequential-thinking entry
  - [x] Check `mcp.json` for sequential-thinking entry (key or args-based)
  - [x] Handle multiple key formats: sequential-thinking, sequential_thinking, sequentialThinking
  - [x] Detect via args containing package name @modelcontextprotocol/server-sequential-thinking
- [x] Write `templates/modules/sequential-thinking.md` with usage directives
- [x] Add `sequential_thinking` to allModules list in detector.ts
- [ ] Add sequential-thinking section generation in `generator.ts`
- [ ] Add recommendation message in `rulebook init` if not detected
- [ ] Add `--add-sequential-thinking` flag to configure it automatically
- [x] Write test: mcp.json with key → detected
- [x] Write test: .cursor/mcp.json with entry → detected
- [x] Write test: args-based detection
- [x] Write test: not present → not detected
- [x] Run full test suite (894 tests passing)
