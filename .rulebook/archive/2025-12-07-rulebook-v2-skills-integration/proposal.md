# Proposal: Rulebook v2.0 - Skills Integration

## Why

The current Rulebook architecture is monolithic, with all rules and directives bundled together in a single AGENTS.md file. This approach has several limitations:

- **Limited modularity**: Users cannot selectively enable/disable specific capabilities without manual editing
- **Poor integration with AI CLI tools**: Each AI CLI (Claude Code, Codex, Gemini CLI) requires different file formats and structures, making it difficult to provide optimal support
- **No marketplace presence**: Rulebook cannot be easily discovered and installed through Claude's plugin marketplace or Hugging Face Skills
- **Complex initialization**: The `init` command asks too many questions upfront, making onboarding slower than necessary
- **Insufficient documentation**: AGENTS.md doesn't clearly explain what capabilities are installed, forcing LLMs to search through files to understand available features
- **Missing skills management**: The MCP server doesn't provide functions to list and manage skills, limiting programmatic access

The Hugging Face Skills ecosystem represents the future of AI agent capabilities, using a standardized format (SKILL.md with YAML frontmatter) that works across all major AI CLI tools. By segmenting Rulebook into modular skills while maintaining backward compatibility, we can:

- Enable users to install only the capabilities they need
- Provide seamless integration with Claude Code, Codex, and Gemini CLI
- Make Rulebook discoverable through Claude's plugin marketplace
- Simplify the initialization process with smart defaults
- Improve documentation clarity for both humans and AI agents
- Enable programmatic skills management through MCP

This version 2.0 represents a major architectural evolution that positions Rulebook as a modern, modular skills-based system while preserving all existing functionality.

## What Changes

### 1. Skills Architecture
- **ADDED** Skills-based modular structure where each capability is a self-contained skill folder
- **ADDED** Each skill contains `SKILL.md` with YAML frontmatter (name, description) and guidance content
- **ADDED** Skills are organized by category (languages, frameworks, modules, workflows, etc.)
- **MODIFIED** Rulebook maintains backward compatibility by automatically loading all skills into AGENTS.md
- **ADDED** Skills can be enabled/disabled individually through configuration

### 2. Claude Plugin Marketplace Integration
- **ADDED** `.claude-plugin` configuration file for Claude Code marketplace registration
- **ADDED** Plugin metadata (name, description, version, repository)
- **ADDED** Skills discovery and installation through Claude's plugin system
- **ADDED** Support for plugin commands and capabilities

### 3. Simplified Initialization
- **MODIFIED** `rulebook init` command to use smart defaults with minimal prompts
- **MODIFIED** Only asks for: (1) primary language, (2) MCP activation preference
- **MODIFIED** Git workflow actions are optional (depends on project maturity)
- **ADDED** `rulebook add <skill>` command to add skills after initialization
- **MODIFIED** Default configuration uses sensible defaults for all other options

### 4. Enhanced AI CLI Support
- **ADDED** Pre-generation of `CLAUDE.md` file with Claude Code-specific instructions
- **ADDED** Pre-generation of `CODEX.md` file with Codex-specific instructions  
- **ADDED** Pre-generation of `GEMINI.md` file with Gemini CLI-specific instructions
- **ADDED** `gemini-extension.json` for Gemini CLI integration
- **MODIFIED** Each CLI gets optimized instructions and examples for their specific format

### 5. Improved AGENTS.md Documentation
- **MODIFIED** AGENTS.md explicitly lists all installed skills and their capabilities
- **MODIFIED** AGENTS.md clearly documents what each skill provides (no need for LLMs to search)
- **ADDED** Skills index section showing available skills and their descriptions
- **ADDED** Capabilities summary section explaining what's enabled

### 6. MCP Skills Management
- **ADDED** `rulebook_skill_list` MCP function to list all available skills
- **ADDED** `rulebook_skill_show` MCP function to show skill details
- **ADDED** `rulebook_skill_enable` MCP function to enable a skill
- **ADDED** `rulebook_skill_disable` MCP function to disable a skill
- **MODIFIED** MCP server to support skills management operations

### 7. Skills Structure
- **ADDED** `/rulebook/skills/` directory structure
- **ADDED** Skills organized by category: `languages/`, `frameworks/`, `modules/`, `workflows/`, etc.
- **ADDED** Each skill folder contains `SKILL.md` with YAML frontmatter and guidance
- **ADDED** Skills can include supporting files (scripts, templates, examples)

## Impact

- **Affected specs**: 
  - `specs/cli/spec.md` (init command changes, add command)
  - `specs/core/spec.md` (skills architecture, backward compatibility)
  - `specs/mcp/spec.md` (skills management functions)
  - `specs/core/skills/spec.md` (new skills system specification)

- **Affected code**: 
  - `src/cli/commands.ts` (simplified init, new add command)
  - `src/core/generator.ts` (skills loading and merging)
  - `src/core/config-manager.ts` (skills configuration)
  - `src/mcp/rulebook-server.ts` (skills management functions)
  - `src/core/skills-manager.ts` (new skills management module)
  - `templates/` (skills structure and templates)

- **Breaking change**: NO (backward compatible - existing projects continue to work)

- **User benefit**: 
  - Faster onboarding with simplified init
  - Better integration with AI CLI tools
  - Discoverable through Claude marketplace
  - Modular architecture allows selective capability installation
  - Clearer documentation for both humans and AI agents
  - Programmatic skills management through MCP
