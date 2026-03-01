# Proposal: AGENTS.override.md Pattern for User Customizations

## Context

When `rulebook update` regenerates AGENTS.md, user customizations are currently preserved via merge markers (`<!-- RULEBOOK:START/END -->`). However, this approach has limitations:
- Users must place customizations inside specific comment blocks
- Merge conflicts are common when both rulebook and user update the same section
- No way to add project-specific rules that survive complete regeneration

The `AGENTS.override.md` pattern solves this: a separate file that always takes precedence over generated content.

## Solution

1. **`AGENTS.override.md`** — user-owned file that is never modified by rulebook:
   - Created empty on first `rulebook init` with usage instructions
   - Always appended to the end of generated AGENTS.md
   - Never overwritten by `rulebook update`

2. **Merge behavior**:
   - Generated AGENTS.md is produced as usual
   - Content of AGENTS.override.md is appended as "## Project-Specific Overrides"
   - If AGENTS.override.md is empty, nothing is appended

3. **CLI integration**:
   - `rulebook override edit` — opens AGENTS.override.md in $EDITOR
   - `rulebook override show` — displays current override content
   - `rulebook override clear` — resets to empty template

## Files to Modify

- `src/core/generator.ts` — read and append AGENTS.override.md
- `src/core/merger.ts` — never touch AGENTS.override.md content
- `src/cli/commands.ts` — add `override` subcommand
- `templates/core/AGENTS.override.md` — empty template with instructions
