# Proposal: Generate .cursor/rules/*.mdc Files (Replace Deprecated .cursorrules)

## Context

Cursor IDE deprecated `.cursorrules` in v0.45+ in favor of `.cursor/rules/*.mdc` files. The new format supports:
- Multiple rule files (one per concern/language)
- YAML frontmatter with `description`, `globs`, and `alwaysApply` fields
- Scoped application (only applied when matching file globs are open)
- Better context window efficiency (rules loaded on demand)

Rulebook currently generates `.cursorrules` via the legacy format. This needs to be replaced.

## Solution

1. **Detect** if project uses Cursor (`.cursor/` directory exists or `cursor` in cliTools)
2. **Generate** `.cursor/rules/` directory with structured `.mdc` files:
   - `rulebook.mdc` — core project directives (always apply)
   - `<language>.mdc` — language-specific rules (glob: `**/*.ts`, etc.)
   - `ralph.mdc` — Ralph autonomous loop rules (always apply if ralph enabled)
   - `quality.mdc` — quality enforcement rules (always apply)
3. **Deprecate** `.cursorrules` generation — keep for backward compat but add deprecation notice
4. **Add `cursor-mdc` to detection**: check `.cursor/rules/` or Cursor installation

## New Files

- `templates/ides/cursor-mdc/rulebook.mdc.template`
- `templates/ides/cursor-mdc/<language>.mdc.template` (TypeScript, Python, Rust, Go)
- `src/core/cursor-mdc-generator.ts` — new module

## Files to Modify

- `src/core/detector.ts` — detect cursor-mdc support
- `src/core/generator.ts` — call cursor-mdc-generator when cursor detected
- `src/cli/commands.ts` — show cursor-mdc generation output in init/update
- `tests/cursor-mdc.test.ts` — new test file
