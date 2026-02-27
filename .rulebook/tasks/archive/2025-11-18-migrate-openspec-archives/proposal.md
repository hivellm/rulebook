# Proposal: Migrate OpenSpec Archives to Rulebook

## Why
OpenSpec archives in `/openspec/changes/archive/` need to be migrated to Rulebook format in `/rulebook/tasks/archive/` to complete the deprecation of OpenSpec. This ensures all historical tasks are preserved in the new system and removes remaining OpenSpec dependencies. Additionally, OpenSpec commands in `.cursor/commands/` must be removed and replaced with Rulebook task commands following the same pattern.

## What Changes
- Migrate all archived OpenSpec tasks from `/openspec/changes/archive/` to `/rulebook/tasks/archive/`
- Remove OpenSpec commands from `.cursor/commands/` (openspec-proposal.md, openspec-archive.md, openspec-apply.md)
- Create Rulebook task commands in `.cursor/commands/` following OpenSpec pattern
- Update RULEBOOK.md with complete command specifications
- Fix validation bug that incorrectly reports scenarios with 3 hashtags
- Test all task management commands to ensure they work correctly

## Impact
- Affected specs: core/spec.md (migration requirements)
- Affected code: src/core/openspec-migrator.ts, src/core/task-manager.ts, .cursor/commands/
- Breaking change: NO (migration only)
- User benefit: Complete removal of OpenSpec dependencies, better IDE integration with Rulebook commands
