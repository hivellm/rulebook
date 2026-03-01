## 1. Implementation
- [ ] 1.1 Create `templates/core/MULTI_AGENT.md` with team directives and patterns
- [ ] 1.2 Update `setupClaudeCodeIntegration()` to write `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to `.claude/settings.json`
- [ ] 1.3 Add settings.json merge logic (preserve existing env vars, only add missing flag)
- [ ] 1.4 Generate `.claude/agents/` directory with default agent definitions during init
- [ ] 1.5 Add multi-agent section to generated CLAUDE.md in target projects
- [ ] 1.6 Update generator.ts to include MULTI_AGENT.md in `.rulebook/specs/`

## 2. Testing
- [ ] 2.1 Write test: settings.json gets agent teams flag on init
- [ ] 2.2 Write test: existing settings.json env vars preserved during merge
- [ ] 2.3 Write test: MULTI_AGENT.md template generated correctly
- [ ] 2.4 Write test: .claude/agents/ directory created with definitions

## 3. Documentation
- [ ] 3.1 Update CLAUDE.md instructions with multi-agent section
- [ ] 3.2 Update CHANGELOG for v4.0.0
