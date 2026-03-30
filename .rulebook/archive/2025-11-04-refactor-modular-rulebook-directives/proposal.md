# Proposal: Refactor Modular Rulebook Directives

## Why
The current architecture embeds all rulebook templates directly into AGENTS.md during init and update operations. This approach has significant limitations:
- **File size limit**: AI assistants have character limits (often 100k+), and AGENTS.md is approaching this threshold with all templates embedded
- **Maintainability**: Large monolithic AGENTS.md files are difficult to navigate and update
- **Modularity**: Templates cannot be referenced individually, forcing AI assistants to load everything even when only specific rules are needed
- **Performance**: Large context sizes impact AI performance and token usage

The solution is to restructure rulebook to keep only core rules in AGENTS.md and store detailed directives in a `/rulebook` directory with references for on-demand access.

## What Changes
- **BREAKING** Change in AGENTS.md generation structure
  - AGENTS.md will contain only core rulebook rules and references to modular directives
  - Detailed language/framework/module directives moved to `/rulebook/[MODULE].md` files
- **ADDED** `/rulebook` directory structure in project root
  - Each template becomes a standalone file (e.g., `/rulebook/TYPESCRIPT.md`, `/rulebook/OPENSPEC.md`)
  - Files include clear usage instructions and cross-references
- **MODIFIED** AGENTS.md generation to include references instead of full content
  - Core rules stay in AGENTS.md
  - References with clear usage instructions for each module
  - Example: "For TypeScript-specific rules, see `/rulebook/TYPESCRIPT.md`"
- **MODIFIED** Generator logic to create `/rulebook` directory and files
  - `generator.ts` updated to write modular files
  - Template injection logic refactored
- **MODIFIED** Update command to migrate existing projects
  - Migrate existing embedded templates to `/rulebook/` directory
  - Update AGENTS.md references

## Impact
- Affected specs: core (template generation and injection)
- Affected code: 
  - `src/core/generator.ts` (major refactor)
  - `src/core/merger.ts` (update merge logic)
  - `src/cli/commands.ts` (init/update commands)
  - `templates/modules/*.md` (moved to `/rulebook/`)
  - `templates/languages/*.md` (moved to `/rulebook/`)
  - `templates/frameworks/*.md` (moved to `/rulebook/`)
- Breaking change: **YES** - AGENTS.md structure changes, but migration path provided
- User benefit: 
  - Smaller AGENTS.md files
  - Better AI performance with modular context
  - Easier maintenance and updates
  - On-demand loading of specific directives

