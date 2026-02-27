# Proposal: Migrate `rulebook/` directory into `.rulebook/`

## Why

The project currently has two separate directories at the root:

- **`rulebook/`** — Contains `specs/` (language/framework rule files) and `tasks/` (task management)
- **`.rulebook/`** — Contains `rulebook.json` (config), `memory/` (persistent memory), and `ralph/` (autonomous loop)

This split is confusing and pollutes the project root with a visible `rulebook/` directory that should be an implementation detail. All rulebook-managed data should live under a single `.rulebook/` hidden directory, keeping the project root clean.

Additionally, `rulebook/specs/` files are referenced from `AGENTS.md` with paths like `/rulebook/specs/TYPESCRIPT.md`. After migration, these references must update to `/.rulebook/specs/TYPESCRIPT.md`.

## What Changes

1. **Directory consolidation**: Move `rulebook/specs/` → `.rulebook/specs/` and `rulebook/tasks/` → `.rulebook/tasks/`
2. **Automatic migration**: During `rulebook init` and `rulebook update`, detect old `rulebook/` directory and migrate contents to `.rulebook/`
3. **Remove empty `rulebook/`**: After successful migration, delete the now-empty `rulebook/` directory
4. **Update all path references**: Change default `rulebookDir` from `'rulebook'` to `'.rulebook'` across all source files
5. **Update AGENTS.md references**: Generator must output `/.rulebook/specs/` instead of `/rulebook/specs/`
6. **Update MCP server**: Default `tasksDir` and `archiveDir` paths must point to `.rulebook/tasks` and `.rulebook/archive`
7. **Update ConfigManager**: Default config values must reflect new paths
8. **Backward compatibility**: Old `rulebook/` structure detected and migrated automatically — no manual user intervention

## Impact

- **Affected specs**: generator.ts, task-manager.ts, migrator.ts, openspec-migrator.ts, validator.ts, config-manager.ts, rulebook-server.ts, prd-generator.ts, commands.ts, types.ts
- **Breaking change**: YES — Path references in AGENTS.md will change from `/rulebook/specs/` to `/.rulebook/specs/`
- **User benefit**: Cleaner project root, single hidden directory for all rulebook data, consistent with `.git/` and `.github/` conventions
- **Migration is non-destructive**: Files are copied first, then old directory removed only after verification
