## 1. Skills Architecture Design
- [x] 1.1 Design skills folder structure and organization
- [x] 1.2 Define SKILL.md format with YAML frontmatter
- [x] 1.3 Design skills loading and merging mechanism
- [x] 1.4 Plan backward compatibility strategy
- [x] 1.5 Design skills configuration system

## 2. Skills Implementation
- [x] 2.1 Create `src/core/skills-manager.ts` module
- [x] 2.2 Implement skills discovery and loading
- [x] 2.3 Implement skills merging into AGENTS.md
- [x] 2.4 Create skills directory structure in templates
- [x] 2.5 Convert existing rules into skills format (TypeScript and Rulebook skills created as examples)
- [x] 2.6 Implement skills enable/disable functionality

## 3. Claude Plugin Marketplace
- [x] 3.1 Create `.claude-plugin/plugin.json` manifest
- [x] 3.2 Create plugin commands (rulebook-init, rulebook-skill, rulebook-task)
- [x] 3.3 Create plugin MCP configuration (.mcp.json)
- [x] 3.4 Create plugin skill example (rulebook-standards)
- [x] 3.5 Test plugin installation and discovery (claude-plugin.test.ts - 15 tests)
- [x] 3.6 Document marketplace submission process (docs/guides/MARKETPLACE_SUBMISSION.md)

## 4. Simplified Init Command
- [x] 4.1 Auto-enable skills on init based on project detection
- [x] 4.2 Auto-enable skills on update (preserves existing, adds new detected)
- [x] 4.3 Refactor `init` command to use smart defaults (--quick flag)
- [x] 4.4 Reduce prompts to: language and MCP activation (promptSimplifiedConfig)
- [x] 4.5 Make Git workflow actions optional (default: false in quick mode)
- [x] 4.6 Implement default configuration values (smart defaults in quick mode)
- [x] 4.7 Update init command tests (init-command.test.ts - 13 tests)

## 5. CLI Skill Commands
- [x] 5.1 Create `rulebook skill list` command
- [x] 5.2 Create `rulebook skill add <skill-id>` command
- [x] 5.3 Create `rulebook skill remove <skill-id>` command
- [x] 5.4 Create `rulebook skill show <skill-id>` command
- [x] 5.5 Create `rulebook skill search <query>` command

## 6. AI CLI Support Files
- [x] 6.1 CLAUDE.md template already exists
- [x] 6.2 CODEX.md template already exists
- [x] 6.3 GEMINI.md template already exists
- [x] 6.4 Create `gemini-extension.json` for Gemini CLI
- [x] 6.5 Update generator to pre-create these files (generateAICLIFiles function)
- [x] 6.6 Test each CLI integration (cli-integration.test.ts - 18 tests)

## 7. AGENTS.md Improvements
- [x] 7.1 Add skills index section to AGENTS.md template (in mergeSkillsContent)
- [x] 7.2 Add capabilities summary section (Project Capabilities grouped by category)
- [x] 7.3 Explicitly list installed skills and their purposes (skills index table)
- [x] 7.4 Improve documentation clarity for LLMs (skill commands help text)
- [x] 7.5 Update generator to populate skills information (done in generateModularAgents)

## 8. MCP Skills Management
- [x] 8.1 Add `rulebook_skill_list` MCP function
- [x] 8.2 Add `rulebook_skill_show` MCP function
- [x] 8.3 Add `rulebook_skill_enable` MCP function
- [x] 8.4 Add `rulebook_skill_disable` MCP function
- [x] 8.5 Update MCP server with skills management
- [x] 8.6 Add `rulebook_skill_search` MCP function
- [x] 8.7 Add `rulebook_skill_validate` MCP function
- [x] 8.8 Add MCP function tests (mcp-skills.test.ts - 18 tests)

## 9. Testing
- [x] 9.1 Write unit tests for skills-manager.ts (35 tests)
- [x] 9.2 Write integration tests for skills loading (skill-commands.test.ts - 13 tests)
- [x] 9.3 Test backward compatibility with existing projects (backward-compatibility.test.ts - 11 tests)
- [x] 9.4 Test simplified init command (init-command.test.ts)
- [x] 9.5 Test CLI skill commands (skill-commands.test.ts)
- [x] 9.6 Test MCP skills management functions (18 tests passing)
- [x] 9.7 Verify all tests passing (697 tests)

## 10. Documentation
- [x] 10.1 Update README with skills architecture
- [x] 10.2 Document skills creation and structure (in README)
- [x] 10.3 Update CHANGELOG with v2.0 changes
- [x] 10.4 Create migration guide for existing users (docs/guides/MIGRATION_V2.md)
- [x] 10.5 Document marketplace submission (docs/guides/MARKETPLACE_SUBMISSION.md)
- [x] 10.6 Update CLI documentation (skill commands in README)

## 11. Migration and Compatibility
- [x] 11.1 Ensure existing projects continue to work (backward compatible types)
- [x] 11.2 Test migration from v1.x to v2.0 (backward-compatibility.test.ts)
- [x] 11.3 Create migration script if needed (not needed - auto-migration on update)
- [x] 11.4 Update version to 2.0.0
