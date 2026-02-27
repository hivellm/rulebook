## 1. Migration Function

- [x] 1.1 Create `migrateRulebookDirectory()` in `src/core/config-manager.ts` to move `rulebook/specs/` → `.rulebook/specs/` and `rulebook/tasks/` → `.rulebook/tasks/`
- [x] 1.2 Add safety checks: verify source exists, skip if destination already has content, copy then delete
- [x] 1.3 Remove empty `rulebook/` directory after successful migration

## 2. Default Path Changes

- [x] 2.1 Change default `rulebookDir` from `'rulebook'` to `'.rulebook'` in `src/types.ts` (ProjectConfig and RulebookConfig interfaces)
- [x] 2.2 Update `src/core/generator.ts` — all `rulebookDir` defaults and `/rulebook/specs/` references to `/.rulebook/specs/`
- [x] 2.3 Update `src/core/task-manager.ts` — default path and `createTaskManager()` factory
- [x] 2.4 Update `src/core/migrator.ts` — all `rulebookDir` defaults
- [x] 2.5 Update `src/core/openspec-migrator.ts` — all `rulebookDir` defaults
- [x] 2.6 Update `src/core/validator.ts` — specs directory resolution
- [x] 2.7 Update `src/core/prd-generator.ts` — default `tasksDir`
- [x] 2.8 Update `src/mcp/rulebook-server.ts` — default `tasksDir` and `archiveDir`

## 3. CLI Integration

- [x] 3.1 Call `migrateRulebookDirectory()` during `initCommand` (after config init)
- [x] 3.2 Call `migrateRulebookDirectory()` during `updateCommand` (before generation)
- [x] 3.3 Update all `config.rulebookDir || 'rulebook'` fallbacks in `src/cli/commands.ts` to `'.rulebook'`
- [x] 3.4 Update MCP init default paths (`rulebook/tasks` → `.rulebook/tasks`)

## 4. Testing

- [x] 4.1 Add migration tests: detect old `rulebook/` and migrate to `.rulebook/`
- [x] 4.2 Add test: skip migration when `.rulebook/specs/` already exists
- [x] 4.3 Add test: remove empty `rulebook/` after migration
- [x] 4.4 Update existing tests that reference `'rulebook'` as default directory
- [x] 4.5 Run full test suite and ensure 830+ tests pass
- [x] 4.6 Verify generator outputs `/.rulebook/specs/` paths in AGENTS.md

## 5. Documentation

- [x] 5.1 Update CLAUDE.md — project structure, architecture references
- [x] 5.2 Update CHANGELOG.md with migration entry
- [x] 5.3 Update README.md if it references `rulebook/` paths
- [x] 5.4 Bump version to 3.3.0 (breaking path change)
