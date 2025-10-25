# Tasks: Standardize CLI Agent Implementations

## Phase 1: Research
- [ ] **RESEARCH-001**: Document claude-code CLI flags and output format
- [ ] **RESEARCH-002**: Document gemini-cli CLI flags and output format
- [ ] **RESEARCH-003**: Test claude-code manually and capture output samples
- [ ] **RESEARCH-004**: Test gemini-cli manually and capture output samples

## Phase 2: Remove Deprecated Tools
- [ ] **REFACTOR-001**: Remove cursor-cli from detectAvailableTools()
- [ ] **REFACTOR-002**: Remove claude-cli from detectAvailableTools()
- [ ] **REFACTOR-003**: Remove gemini-cli-legacy from detectAvailableTools()
- [ ] **REFACTOR-004**: Update CLITool type definitions
- [ ] **REFACTOR-005**: Update all command handlers to remove deprecated tools
- [ ] **TEST-001**: Update cli-bridge.test.ts to remove deprecated tool tests

## Phase 3: Implement claude-code Parser
- [ ] **IMPLEMENT-001**: Create src/agents/claude-code.ts
- [ ] **IMPLEMENT-002**: Define ClaudeCodeEvent types
- [ ] **IMPLEMENT-003**: Implement ClaudeCodeStreamParser class
- [ ] **IMPLEMENT-004**: Add line buffering logic
- [ ] **IMPLEMENT-005**: Implement completion detection
- [ ] **IMPLEMENT-006**: Add progress indicators
- [ ] **INTEGRATE-001**: Integrate parser in cli-bridge.ts
- [ ] **TEST-002**: Write unit tests for claude-code parser
- [ ] **TEST-003**: Write integration test for claude-code

## Phase 4: Implement gemini-cli Parser
- [ ] **IMPLEMENT-007**: Create src/agents/gemini-cli.ts
- [ ] **IMPLEMENT-008**: Define GeminiEvent types
- [ ] **IMPLEMENT-009**: Implement GeminiStreamParser class
- [ ] **IMPLEMENT-010**: Add line buffering logic
- [ ] **IMPLEMENT-011**: Implement completion detection
- [ ] **IMPLEMENT-012**: Add progress indicators
- [ ] **INTEGRATE-002**: Integrate parser in cli-bridge.ts
- [ ] **TEST-004**: Write unit tests for gemini-cli parser
- [ ] **TEST-005**: Write integration test for gemini-cli

## Phase 5: Documentation
- [ ] **DOCS-001**: Update README.md agent section
- [ ] **DOCS-002**: Create /docs/CLI_AGENTS.md guide
- [ ] **DOCS-003**: Add installation instructions for all agents
- [ ] **DOCS-004**: Add usage examples for all agents
- [ ] **DOCS-005**: Document troubleshooting for each agent
- [ ] **DOCS-006**: Update CHANGELOG.md with breaking changes

## Phase 6: Testing & Quality
- [ ] **QA-001**: Run full test suite (npm test)
- [ ] **QA-002**: Verify 95%+ coverage (npm run test:coverage)
- [ ] **QA-003**: Test cursor-agent with real prompts
- [ ] **QA-004**: Test claude-code with real prompts
- [ ] **QA-005**: Test gemini-cli with real prompts
- [ ] **QA-006**: Performance testing (< 100MB memory, < 5s response)
- [ ] **QA-007**: Run type-check (npm run type-check)
- [ ] **QA-008**: Run linter (npm run lint)
- [ ] **QA-009**: Run formatter (npm run format)
- [ ] **QA-010**: Final code review

## Dependencies
- RESEARCH tasks must complete before IMPLEMENT
- REFACTOR tasks should complete before IMPLEMENT
- IMPLEMENT tasks must complete before TEST
- All TEST tasks must pass before DOCS
- All DOCS must complete before QA

## Estimated Timeline
- Phase 1 (Research): 4 hours
- Phase 2 (Refactor): 2 hours
- Phase 3 (claude-code): 8 hours
- Phase 4 (gemini-cli): 8 hours
- Phase 5 (Documentation): 4 hours
- Phase 6 (Testing & QA): 6 hours
**Total: ~32 hours (~4 days)**

## Priority
**High** - Standardization improves maintainability and user experience

## Blockers
- Need access to `claude-code` for testing
- Need access to `gemini-cli` for testing

