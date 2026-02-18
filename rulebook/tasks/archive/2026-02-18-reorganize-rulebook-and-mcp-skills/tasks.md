## 1. Directory Reorganization
- [x] 1.1 Create `/rulebook/specs/` directory
- [x] 1.2 Move all 9 `.md` files from `/rulebook/` root to `/rulebook/specs/` (RULEBOOK.md, TYPESCRIPT.md, QUALITY_ENFORCEMENT.md, GIT.md, AGENT_AUTOMATION.md, RUST.md, VECTORIZER.md, CONTEXT7.md, RULEBOOK_MCP.md)
- [x] 1.3 Update `src/core/generator.ts` — change `writeModularFile()` output path to include `specs/` subpath
- [x] 1.4 Update `src/core/generator.ts` — change all reference paths in generated AGENTS.md to use `specs/` subpath
- [x] 1.5 Update `src/core/migrator.ts` — add migration logic to detect flat layout and move files to `specs/`
- [x] 1.6 Verify AGENTS.md is regenerated correctly with new paths
- [x] 1.7 Update all templates, docs, CLAUDE.md to use `/rulebook/specs/` paths
- [x] 1.8 Update `src/core/openspec-migrator.ts` to check both specs/ and legacy paths

## 2. Task Management MCP Tool Skills
- [x] 2.1 Create `skills/rulebook-task-create/SKILL.md` with input schema, examples, error handling
- [x] 2.2 Create `skills/rulebook-task-list/SKILL.md`
- [x] 2.3 Create `skills/rulebook-task-show/SKILL.md`
- [x] 2.4 Create `skills/rulebook-task-update/SKILL.md`
- [x] 2.5 Create `skills/rulebook-task-validate/SKILL.md`
- [x] 2.6 Create `skills/rulebook-task-archive/SKILL.md`
- [x] 2.7 Create `skills/rulebook-task-delete/SKILL.md`

## 3. Skill Management MCP Tool Skills
- [x] 3.1 Create `skills/rulebook-skill-list/SKILL.md`
- [x] 3.2 Create `skills/rulebook-skill-show/SKILL.md`
- [x] 3.3 Create `skills/rulebook-skill-enable/SKILL.md`
- [x] 3.4 Create `skills/rulebook-skill-disable/SKILL.md`
- [x] 3.5 Create `skills/rulebook-skill-search/SKILL.md`
- [x] 3.6 Create `skills/rulebook-skill-validate/SKILL.md`

## 4. Update Existing Skills
- [x] 4.1 Update `skills/rulebook-mcp/SKILL.md` to reference individual tool skills instead of listing all tools inline
- [x] 4.2 Verify all existing skills still work with new directory structure

## 5. Claude Code Auto-Setup
- [x] 5.1 Create `src/core/claude-mcp.ts` — detect Claude Code, configure `.mcp.json`, install skills
- [x] 5.2 Integrate into `initCommand` in `src/cli/commands.ts`
- [x] 5.3 Integrate into `updateCommand` in `src/cli/commands.ts`
- [x] 5.4 Create `tests/claude-mcp-setup.test.ts` — 15 tests covering detection, merge, install

## 6. Config Version Sync
- [x] 6.1 Update `src/core/config-manager.ts` — replace hardcoded `CONFIG_VERSION` with dynamic `getPackageVersion()`
- [x] 6.2 Update `tests/config-manager.test.ts` — use dynamic `PKG_VERSION` instead of hardcoded `'1.0.0'`
- [x] 6.3 Update `tests/backward-compatibility.test.ts` — fix version expectation after migration

## 7. Testing
- [x] 7.1 Run `npm run build` — compiles without errors
- [x] 7.2 Run `npm test` — all tests pass (718 passed, 236 skipped, 2 pre-existing failures in claude-plugin.test.ts)
- [x] 7.3 Run `npm run lint` — no warnings
- [x] 7.4 Run `npm run type-check` — no errors
- [x] 7.5 Verify AGENTS.md references point to correct `/rulebook/specs/*.md` paths
- [x] 7.6 Verify MCP server responds with 13 tools (7 task + 6 skill)
- [x] 7.7 Update CHANGELOG.md and README.md with new features
