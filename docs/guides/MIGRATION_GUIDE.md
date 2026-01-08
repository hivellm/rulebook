# Migration Guide: Modular Architecture

This guide explains the migration from embedded templates to the new modular architecture introduced in version 0.17.0.

## Overview

**Before (Legacy Mode):**
- All templates embedded directly in AGENTS.md
- Large AGENTS.md files (often 100k+ characters)
- Difficult to navigate and maintain

**After (Modular Mode):**
- Core rules remain in AGENTS.md
- Language/framework/module templates in `/rulebook/` directory
- AGENTS.md contains references to modular files
- Smaller, more manageable files

## Automatic Migration

**Good News**: Migration is automatic! When you run `rulebook update`, the system will:

1. Detect embedded templates in your AGENTS.md
2. Extract templates to `/rulebook/[NAME].md` files
3. Replace embedded content with references
4. Preserve all your custom content

### Example

**Before:**
```markdown
<!-- RULEBOOK:START -->
# Project Rules
...
<!-- RULEBOOK:END -->

<!-- TYPESCRIPT:START -->
# TypeScript Rules
[Full TypeScript template content...]
<!-- TYPESCRIPT:END -->
```

**After:**
```markdown
<!-- RULEBOOK:START -->
# Project Rules
...
<!-- RULEBOOK:END -->

## TypeScript Development Rules

For comprehensive TypeScript-specific guidelines, see `/rulebook/TYPESCRIPT.md`

Quick reference:
- Type safety and strict mode
- Code quality standards
- Testing requirements (95%+ coverage)
- Package management
- Error handling patterns
```

And `/rulebook/TYPESCRIPT.md` contains:
```markdown
<!-- TYPESCRIPT:START -->
# TypeScript Rules
[Full TypeScript template content...]
<!-- TYPESCRIPT:END -->
```

## Manual Migration (If Needed)

If you prefer to migrate manually:

1. **Create `/rulebook/` directory:**
   ```bash
   mkdir rulebook
   ```

2. **Extract templates:**
   - Find blocks like `<!-- TYPESCRIPT:START -->` to `<!-- TYPESCRIPT:END -->`
   - Copy content to `/rulebook/TYPESCRIPT.md`
   - Repeat for all languages, frameworks, and modules

3. **Replace with references:**
   - Remove embedded template blocks from AGENTS.md
   - Add reference sections (see format above)

4. **Run validation:**
   ```bash
   rulebook validate
   ```

## Directory Structure

After migration, your project will have:

```
project/
├── AGENTS.md           # Core rules + references
├── rulebook/           # Modular templates
│   ├── TYPESCRIPT.md
│   ├── RUST.md
│   ├── REACT.md
│   ├── OPENSPEC.md
│   └── ...
└── ...
```

## Benefits

1. **Smaller AGENTS.md**: Typically 5-10k characters instead of 100k+
2. **Better AI Performance**: AI assistants load only what they need
3. **Easier Maintenance**: Update individual templates without touching AGENTS.md
4. **Better Organization**: Clear separation of concerns

## Legacy Mode (Not Recommended)

If you must use embedded templates (not recommended):

```typescript
// In your config or .rulebook file
{
  "modular": false
}
```

**Note**: Legacy mode is deprecated and may be removed in future versions.

## Troubleshooting

### Issue: Migration didn't run

**Solution**: Ensure you're running `rulebook update` (not `rulebook init`)

### Issue: `/rulebook/` directory not created

**Solution**: Check permissions, ensure you have write access to project root

### Issue: References not working

**Solution**: Verify that:
1. `/rulebook/` directory exists
2. Template files exist (e.g., `/rulebook/TYPESCRIPT.md`)
3. File names match exactly (case-sensitive)

## Rollback

If you need to rollback to embedded mode:

1. Copy content from `/rulebook/*.md` files back into AGENTS.md
2. Set `modular: false` in config
3. Remove `/rulebook/` directory

**Note**: This is not recommended. The modular structure is the future of rulebook.

## Questions?

- Check [README.md](../../README.md) for general information
- See [BEST_PRACTICES.md](./BEST_PRACTICES.md) for usage tips
- Open an issue on GitHub for support

