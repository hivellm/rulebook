# Migration Guide: OpenSpec to Rulebook Task Management

This guide helps you migrate from OpenSpec to Rulebook's built-in task management system.

## Overview

Starting with version 0.18.0, Rulebook includes a built-in task management system that replaces OpenSpec. The new system uses OpenSpec-compatible format, so your existing tasks can be migrated automatically.

## Automatic Migration

**The easiest way to migrate is automatic:**

```bash
rulebook update
```

This command will:
1. Detect existing OpenSpec tasks in `/openspec/changes/`
2. Migrate them to `/rulebook/tasks/`
3. Migrate archived tasks from `/openspec/changes/archive/` to `/rulebook/tasks/archive/`
4. Remove `/rulebook/OPENSPEC.md` if it exists
5. Remove OpenSpec commands from `.cursor/commands/`
6. **Remove `/openspec` directory** after successful migration
7. Update AGENTS.md with new task management directives

## What Gets Migrated

### Task Structure
- **proposal.md** → `/rulebook/tasks/<task-id>/proposal.md`
- **tasks.md** → `/rulebook/tasks/<task-id>/tasks.md`
- **design.md** → `/rulebook/tasks/<task-id>/design.md` (if exists)
- **specs/** → `/rulebook/tasks/<task-id>/specs/` (preserved)

### Task Format
- OpenSpec-compatible format is preserved
- All validation rules remain the same
- Context7 MCP requirement still applies

## Manual Migration Steps

If you prefer to migrate manually:

### 1. Create Rulebook Tasks Directory

```bash
mkdir -p rulebook/tasks
```

### 2. Migrate Each Task

For each task in `/openspec/changes/<task-id>/`:

```bash
# Create task directory
mkdir -p rulebook/tasks/<task-id>

# Copy files
cp openspec/changes/<task-id>/proposal.md rulebook/tasks/<task-id>/
cp openspec/changes/<task-id>/tasks.md rulebook/tasks/<task-id>/

# Copy design if exists
if [ -f openspec/changes/<task-id>/design.md ]; then
  cp openspec/changes/<task-id>/design.md rulebook/tasks/<task-id>/
fi

# Copy specs
if [ -d openspec/changes/<task-id>/specs ]; then
  cp -r openspec/changes/<task-id>/specs rulebook/tasks/<task-id>/
fi
```

### 3. Remove OpenSpec Files

```bash
# Remove OPENSPEC.md from rulebook
rm -f rulebook/OPENSPEC.md

# Archive OpenSpec directory (optional)
mv openspec openspec-archive-$(date +%Y-%m-%d)
```

### 4. Update AGENTS.md

Run `rulebook update` to update AGENTS.md with new task management directives.

## Command Changes

### Old OpenSpec Commands (Deprecated)

```bash
# ❌ These commands are deprecated
openspec task create
openspec task list
openspec task show
openspec task archive
```

### New Rulebook Commands

```bash
# ✅ Use these instead
rulebook task create <task-id>
rulebook task list
rulebook task show <task-id>
rulebook task validate <task-id>
rulebook task archive <task-id>
```

## Task Format Compatibility

**Good news**: Rulebook uses OpenSpec-compatible format, so your existing tasks remain valid!

### What Stays the Same
- ✅ Proposal format (proposal.md)
- ✅ Tasks checklist format (tasks.md)
- ✅ Spec delta format (specs/*/spec.md)
- ✅ Validation rules (SHALL/MUST, 4 hashtags for scenarios, etc.)

### What's New
- ✅ Better integration with Rulebook
- ✅ Automatic validation
- ✅ Better CLI commands
- ✅ Context7 MCP requirement enforced

## Verification

After migration, verify your tasks:

```bash
# List migrated tasks
rulebook task list

# Validate a task
rulebook task validate <task-id>

# Show task details
rulebook task show <task-id>
```

## Troubleshooting

### Task Not Found After Migration

If a task doesn't appear after migration:

1. Check if it was migrated:
   ```bash
   ls -la rulebook/tasks/
   ```

2. Verify task structure:
   ```bash
   rulebook task show <task-id>
   ```

3. Check migration errors:
   - Look for warnings in `rulebook update` output
   - Check if task directory exists in `/openspec/changes/`

### Validation Errors

If validation fails after migration:

1. Validate the task:
   ```bash
   rulebook task validate <task-id>
   ```

2. Check format requirements:
   - See `/rulebook/RULEBOOK.md` for format requirements
   - Use Context7 MCP to get official OpenSpec format documentation

3. Fix format issues:
   - Ensure scenarios use `#### Scenario:` (4 hashtags)
   - Ensure requirements have SHALL/MUST keywords
   - Ensure purpose section has ≥20 characters

## Archive Migration

**Automatic Archive Migration:**

Starting with v0.18.0, `rulebook update` automatically migrates archived OpenSpec tasks:

```bash
rulebook update
```

This will:
1. Migrate active tasks from `/openspec/changes/` to `/rulebook/tasks/`
2. Migrate archived tasks from `/openspec/changes/archive/` to `/rulebook/tasks/archive/`
3. Preserve archive date prefixes (e.g., `2025-01-15-task-id`)
4. Preserve all task structure (proposal.md, tasks.md, design.md, specs/)

**Manual Archive Migration:**

If you need to manually migrate archives:

```bash
# For each archived task in /openspec/changes/archive/:
mkdir -p rulebook/tasks/archive/2025-01-15-task-id
cp -r openspec/changes/archive/2025-01-15-task-id/* rulebook/tasks/archive/2025-01-15-task-id/
```

**Verify Archive Migration:**

```bash
# List archived tasks
rulebook task list --archived

# Show archived task details
rulebook task show 2025-01-15-task-id

# Validate archived task format
rulebook task validate 2025-01-15-task-id
```

## Archive OpenSpec Directory

After successful migration, you can archive the OpenSpec directory:

```bash
# Archive with date
mv openspec openspec-archive-$(date +%Y-%m-%d)

# Or keep it for reference
# (tasks are now in rulebook/tasks/)
```

## Need Help?

- See `/rulebook/RULEBOOK.md` for complete task management guidelines
- Check task format examples in `/rulebook/tasks/`
- Use Context7 MCP for official OpenSpec format documentation

