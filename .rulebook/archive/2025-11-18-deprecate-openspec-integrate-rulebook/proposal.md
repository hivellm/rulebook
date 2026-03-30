# Proposal: Deprecate OpenSpec and Integrate into Rulebook

## Why

The current OpenSpec integration has significant issues:
- **AI models consistently fail** to create OpenSpec tasks in the correct format, requiring constant manual intervention
- **Context7 dependency**: Users must repeatedly request AI assistants to check Context7 MCP for the correct OpenSpec format, which is inefficient
- **Maintenance overhead**: Maintaining separate OpenSpec module templates and integration code adds complexity
- **User confusion**: Having both OpenSpec and Rulebook creates confusion about which system to use for task management

By incorporating OpenSpec functionality directly into Rulebook, we can:
- **Standardize task creation**: Rulebook will enforce the correct format automatically
- **Eliminate format errors**: Built-in validation ensures tasks are created correctly
- **Simplify workflow**: Single system (Rulebook) for all project management needs
- **Better AI guidance**: AGENTS.md will contain clear directives to use Rulebook's task system instead of OpenSpec

## What Changes

- **REMOVED** OpenSpec from supported modules list
- **REMOVED** OpenSpec module templates (`templates/modules/OPENSPEC.md`)
- **REMOVED** OpenSpec detection logic from detector
- **ADDED** Rulebook task management system with OpenSpec-compatible format
- **ADDED** `rulebook task` CLI commands (create, list, archive, validate)
- **ADDED** `/rulebook/RULEBOOK.md` with task creation directives
- **MODIFIED** AGENTS.md generation to include Rulebook task directives
- **MODIFIED** Migration logic to remove OpenSpec from existing projects
- **MODIFIED** All references to OpenSpec to use Rulebook instead

## Impact

- **Breaking change**: Projects using OpenSpec will need to migrate to Rulebook task system
- **Migration path**: Automatic migration of existing OpenSpec tasks to Rulebook format
- **Affected code**:
  - `src/core/detector.ts` - Remove OpenSpec detection
  - `src/types.ts` - Remove OpenSpec types, add Rulebook task types
  - `src/cli/commands.ts` - Add task commands, remove OpenSpec commands
  - `src/core/generator.ts` - Add RULEBOOK.md generation
  - `templates/modules/OPENSPEC.md` - Remove file
  - `rulebook/OPENSPEC.md` - Remove if exists, replace with RULEBOOK.md
- **User benefit**:
  - Single unified system for task management
  - Automatic format validation
  - Better AI assistant guidance
  - Reduced maintenance overhead

