## 1. Implementation
- [x] 1.1 Create `templates/core/MULTI_AGENT.md` with team directives and patterns
- [x] 1.2 Update `setupClaudeCodeIntegration()` to write `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to `.claude/settings.json`
- [x] 1.3 Add settings.json merge logic (preserve existing env vars, only add missing flag)
- [x] 1.4 Generate `.claude/agents/` directory with default agent definitions during init
- [x] 1.5 Add multi-agent section to generated CLAUDE.md in target projects
- [x] 1.6 Update generator.ts to include MULTI_AGENT.md in `.rulebook/specs/`

## 2. Testing
- [x] 2.1 Write test: settings.json gets agent teams flag on init
- [x] 2.2 Write test: existing settings.json env vars preserved during merge
- [x] 2.3 Write test: MULTI_AGENT.md template generated correctly
- [x] 2.4 Write test: .claude/agents/ directory created with definitions

## 3. Documentation
- [x] 3.1 Update CLAUDE.md instructions with multi-agent section
- [x] 3.2 Update CHANGELOG for v4.0.0

## Status: ✅ COMPLETE

Multi-agent development directives fully implemented. Claude Code agent teams are now supported with auto-configuration, pre-built agent definitions, and comprehensive coordination directives.

**Verification:**
- ✅ `templates/core/MULTI_AGENT.md` created with team structure patterns
- ✅ 4 agent definitions created: team-lead.md, researcher.md, implementer.md, tester.md
- ✅ `configureClaudeSettings()` implemented in claude-mcp.ts (line 123)
- ✅ `installAgentDefinitions()` implemented in claude-mcp.ts (line 156)
- ✅ `.claude/settings.json` has CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS flag
- ✅ Agent teams tests passing in claude-mcp-setup.test.ts
- ✅ MULTI_AGENT.md referenced in AGENTS.md generation
