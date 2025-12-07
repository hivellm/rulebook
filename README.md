# @hivehub/rulebook

[![npm version](https://img.shields.io/npm/v/@hivehub/rulebook?logo=npm&logoColor=white)](https://www.npmjs.com/package/@hivehub/rulebook)
[![npm downloads](https://img.shields.io/npm/dm/@hivehub/rulebook?logo=npm&logoColor=white)](https://www.npmjs.com/package/@hivehub/rulebook)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[![Tests](https://img.shields.io/github/actions/workflow/status/hivellm/rulebook/test.yml?label=tests&logo=github)](https://github.com/hivellm/rulebook/actions/workflows/test.yml)
[![Coverage](https://img.shields.io/codecov/c/github/hivellm/rulebook?logo=codecov&logoColor=white)](https://codecov.io/gh/hivellm/rulebook)
[![Build](https://img.shields.io/github/actions/workflow/status/hivellm/rulebook/build.yml?label=build&logo=github)](https://github.com/hivellm/rulebook/actions/workflows/build.yml)
[![Lint](https://img.shields.io/github/actions/workflow/status/hivellm/rulebook/lint.yml?label=lint&logo=github)](https://github.com/hivellm/rulebook/actions/workflows/lint.yml)

> Standardize AI-generated projects with automated templates, quality gates, and framework detection for 28 languages, 17 frameworks, 12 MCP modules, and 20 services.

---

## Why Rulebook?

Large Language Models (LLMs) for software development need **clear directives** to generate high-quality code consistently. Without standardized guidelines, AI-generated code can be inconsistent, error-prone, and difficult to maintain.

**Rulebook solves this by providing:**

- 📋 **Comprehensive Rule Sets**: Language-specific guidelines (TypeScript, Rust, Python, etc.), framework conventions (NestJS, Django, React), testing standards, linting rules, spell-checking, CI/CD pipelines, Git hooks, and version control best practices
- 🎯 **Normalized Deliverables**: Ensures consistent code quality across all AI-generated outputs
- 🛡️ **Error Reduction**: Catches issues early through automated quality gates and pre-commit/pre-push hooks
- ⚙️ **Process Automation**: Automates repetitive tasks like formatting, testing, and deployment
- 🔌 **MCP Integration**: Supports multiple Model Context Protocol (MCP) modules for enhanced AI capabilities
- 📊 **Task Management**: Built-in task management system (OpenSpec-compatible format) for structured development

By giving LLMs a clear "rulebook" to follow, you ensure that every piece of generated code meets your project's standards—**automatically**.

## Quick Start

```bash
# New project (interactive)
npx @hivehub/rulebook@latest init

# Minimal setup (essentials only)
npx @hivehub/rulebook@latest init --minimal

# Light mode (prototypes without strict rules)
npx @hivehub/rulebook@latest init --light

# Update existing project
npx @hivehub/rulebook@latest update
```

## What's New

### v2.0.0 (Latest)

- 🧩 **Skills System**: New modular skills architecture for AI-assisted development
  - Skills are YAML-frontmatter Markdown files with enable/disable functionality
  - 10 skill categories: languages, frameworks, modules, services, workflows, ides, core, cli, git, hooks
  - Auto-detection of skills based on project configuration
  - CLI commands: `rulebook skill list|add|remove|show|search`
  - MCP functions: `rulebook_skill_list|show|enable|disable|search|validate`
- 🤖 **AI CLI Configuration Files**: Auto-generated files for AI CLI tools
  - `CLAUDE.md` - Claude Code CLI configuration
  - `CODEX.md` - OpenAI Codex CLI configuration
  - `GEMINI.md` - Google Gemini CLI configuration
  - `gemini-extension.json` - Gemini CLI extension manifest
- 🔌 **Claude Code Plugin**: `marketplace.json` + `.claude-plugin/` structure for marketplace distribution
  - `marketplace.json` - Marketplace manifest for plugin discovery
  - Plugin manifest, MCP configuration, slash commands, and skills

### v1.1.5

- 🗄️ **Service Integration Templates**: Added comprehensive service integration templates
  - 20 service templates: PostgreSQL, MySQL, MariaDB, SQL Server, Oracle, SQLite, MongoDB, Cassandra, DynamoDB, Redis, Memcached, Elasticsearch, Neo4j, InfluxDB, RabbitMQ, Kafka, S3, Azure Blob, GCS, MinIO
  - Automatic service detection from `package.json`, `.env`, and `docker-compose.yml`
  - Service-specific integration instructions with connection setup, operations, best practices, and configuration
  - Templates generated in `/rulebook/[SERVICE].md` with references in `AGENTS.md`
  - Interactive CLI prompt to select which services to include templates for

### v1.1.4

- 🔧 **Cross-platform Git Hooks**: Git hooks now work on both Windows and Linux
  - Hooks are now generated as Node.js scripts with shell wrappers
  - Shell wrapper detects Node.js in common locations (Windows and Linux)
  - Node.js scripts use native `child_process.spawn` for cross-platform command execution
  - Pre-commit and pre-push hooks now function correctly on Windows (Git Bash) and Linux
- 🔄 **Git Hooks Architecture**: Refactored hook generation system
  - Hooks are now generated as two files: shell wrapper + Node.js script
  - Shell templates (`.sh`) are automatically converted to Node.js scripts
  - Improved command parsing from shell templates to Node.js
  - Better error handling and cross-platform compatibility

### v1.1.3

- 🗑️ **MCP Tool: `rulebook_task_delete`**: Delete tasks permanently
  - New tool to permanently delete tasks from the filesystem
  - Removes task directory recursively
  - Useful for cleaning up test tasks or removing unwanted tasks
  - Total of 7 MCP functions now available

### v1.1.2

- 🔧 **ESLint v9 Migration**: Updated to ESLint flat config format
  - Migrated from `.eslintrc.json` to `eslint.config.js`
  - Updated to ESLint 9.37.0 with TypeScript ESLint 8.47.0
  - Added proper Node.js global type definitions
  - Linting now shows only errors (warnings suppressed with `--quiet`)

### v1.0.3

- 🔧 **Zod v3 Compatibility**: Using Zod v3.25.76 for full MCP SDK compatibility
  - MCP SDK v1.22.0 requires Zod v3 (see [Issue #1429](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1429))
  - Will upgrade to Zod v4 when MCP SDK officially supports it
- 🔄 **Dependency Updates**: All dependencies updated to latest versions
  - TypeScript tooling (ESLint 8.47.0, Vitest 4.0.13)
  - Node.js types updated to support Node.js 24.x
  - CLI tools and build utilities updated
- 🐛 **Windows CI Fix**: Fixed PowerShell compatibility in GitHub Actions workflows
  - Removed bash-specific syntax from Windows runners
  - Cross-platform compatibility improved

### v1.0.2

- 🔌 **MCP Server for Task Management**: New MCP server enables AI models to manage tasks programmatically
  - 7 MCP functions: create, list, show, update, validate, archive, delete tasks
  - Available via `npx @hivellm/rulebook@latest mcp-server` or `npx rulebook-mcp`
  - Better integration with MCP-compatible AI assistants
- ⚡ **Faster Pre-commit Hooks**: Tests removed from pre-commit for faster backup commits
  - Pre-commit now runs only: format check, lint, type-check
  - Tests moved to pre-push hook for comprehensive validation
- 🏗️ **Build Verification**: Build check now mandatory before push (runs first)
- 📦 **pnpm Recommendation**: Added pnpm as preferred package manager with `.npmrc` configuration
- 🚀 **Rust Build Optimization**: Comprehensive guide for faster Rust builds
  - sccache configuration, incremental compilation, lld linker
  - Anti-pattern documentation for `pub use big_crate::*;`
- 📋 **Enhanced Task Management**: Strengthened OpenSpec format compliance and archiving rules
- 📁 **Strict Markdown Organization**: UPPERCASE naming and `/docs` directory requirements

### v1.0.0

- 🎉 **First Stable Release**: Production-ready with comprehensive features
- 🔒 **Apache 2.0 License**: Changed from MIT to Apache License 2.0 for better compatibility
- 🛡️ **Git Hooks Enforcement**: Pre-commit and pre-push hooks now block commits with lint/test errors
- 📋 **Task File Structure Rules**: Enhanced directives in AGENTS.md about correct task structure
- 🎯 **Built-in Task Management**: OpenSpec deprecated and integrated into Rulebook's native task system
- 📋 **RULEBOOK.md Template**: Core template with task management directives and Context7 MCP requirements
- 🚫 **Automatic .gitignore**: `npx @hivellm/rulebook@latest init` now creates/updates `.gitignore` automatically for 28 languages
- 🔄 **Migration Support**: Existing OpenSpec tasks automatically migrated to `/rulebook/tasks/` format

> **Breaking Change**: OpenSpec module removed. Use `npx @hivellm/rulebook@latest task` commands instead. See [Migration Guide](docs/guides/OPENSPEC_MIGRATION.md).

## Key Features

- 🔍 **Auto-Detection**: Detects languages, frameworks (NestJS, React, Spring, etc.), MCP modules, and services (databases, caches, message queues, etc.)
- 📁 **Modular Architecture**: Templates stored in `/rulebook/` directory for better organization
  - Smaller AGENTS.md files (prevents 100k+ character limits)
  - QUALITY_ENFORCEMENT and Git rules moved to `/rulebook/` for cleaner structure
  - On-demand loading for better AI performance
  - Easier maintenance and updates
- 📋 **Simplified AGENTS.md**: Clean, focused structure with only core rules and references
  - Proper hierarchy with `##` and `###` subsections
  - All modules grouped logically
  - Better readability and navigation
- 🔗 **Git Hook Automation**: Optional pre-commit/pre-push hooks with language-aware quality checks
- 🚫 **Automatic .gitignore**: Creates/updates `.gitignore` automatically for 28 languages on `npx @hivellm/rulebook@latest init`
- 🎯 **Minimal Mode**: Quick setup with just README, LICENSE, tests/, and basic CI
- 📝 **106+ Templates**: Languages, frameworks, IDEs, workflows, and services pre-configured
- 🤖 **AI-Optimized**: Works with 23 AI assistants (Cursor, Claude, Gemini, etc.)
- 📦 **Publication Ready**: CI/CD pipelines for npm, crates.io, PyPI, Maven Central, and more
- 🔄 **Automatic Migration**: Existing projects automatically migrated to modular structure and OpenSpec tasks

## What It Does

**For New Projects:**
1. Detects your language(s), frameworks, MCP modules, and services
2. Asks setup questions (or use `--minimal` for defaults)
3. Generates AGENTS.md with AI assistant rules (modular structure)
4. Creates `/rulebook/` directory with language/framework/module/service templates
5. Creates/updates `.gitignore` automatically for detected languages
6. Optionally installs Git hooks (pre-commit/pre-push)
7. Creates GitHub Actions workflows
8. Scaffolds README, LICENSE, /docs, and /tests

**For Existing Projects:**
```bash
npx @hivehub/rulebook update
```
- Automatically migrates embedded templates to modular `/rulebook/` structure
- Automatically migrates OpenSpec tasks to Rulebook format (if OpenSpec exists)
- Merges latest templates while preserving your customizations
- Updates AGENTS.md with references to modular files
- Updates `.gitignore` with missing patterns for detected languages

## Commands

### Core Commands

```bash
# Project Initialization & Updates
npx @hivehub/rulebook@latest init              # Initialize new project (interactive)
npx @hivehub/rulebook@latest init --minimal    # Minimal setup (essentials only)
npx @hivehub/rulebook@latest init --light       # Light mode (no quality enforcement)
npx @hivehub/rulebook@latest init --yes         # Skip prompts, use defaults
npx @hivehub/rulebook@latest update             # Update AGENTS.md to latest version
npx @hivehub/rulebook@latest update --yes      # Update without confirmation
npx @hivehub/rulebook@latest update --light    # Update in light mode

# Workflow & CI/CD
npx @hivehub/rulebook@latest workflows         # Generate GitHub Actions workflows

# Validation & Health
npx @hivehub/rulebook@latest validate          # Check project standards
npx @hivehub/rulebook@latest health            # Project health score (0-100)
npx @hivehub/rulebook@latest fix               # Auto-fix common issues

# Documentation
npx @hivehub/rulebook@latest generate-docs      # Create /docs structure
npx @hivehub/rulebook@latest generate-docs --yes  # Skip prompts, use defaults

# Dependencies & Coverage
npx @hivehub/rulebook@latest check-deps       # Check outdated/vulnerable dependencies
npx @hivehub/rulebook@latest check-coverage   # Check test coverage (default: 95%)
npx @hivehub/rulebook@latest check-coverage -t 80  # Custom threshold

# Versioning
npx @hivehub/rulebook@latest version <type>   # Bump version (major|minor|patch)
npx @hivehub/rulebook@latest changelog        # Generate changelog from git commits
npx @hivehub/rulebook@latest changelog -v 1.0.0  # Specify version
```

> **Note**: If installed globally (`npm install -g @hivehub/rulebook`), you can use `rulebook` directly instead of `npx @hivehub/rulebook@latest`.

### Advanced Commands (Beta)

```bash
# Real-time Monitoring
npx @hivehub/rulebook@latest watcher           # Full-screen task monitoring UI
                                                # - Live task progress tracking
                                                # - Activity log with timestamps
                                                # - System status monitoring
                                                # - Auto-refresh every 2 seconds

# Autonomous Agent
npx @hivehub/rulebook@latest agent             # Start AI CLI workflow automation
npx @hivehub/rulebook@latest agent --dry-run   # Simulate without changes
npx @hivehub/rulebook@latest agent --tool cursor-agent  # Specify CLI tool
npx @hivehub/rulebook@latest agent --iterations 10      # Max iterations
npx @hivehub/rulebook@latest agent --watch     # Enable watcher mode

# Task Management
npx @hivehub/rulebook@latest task create <task-id>     # Create new task
npx @hivehub/rulebook@latest task list                 # List all tasks
npx @hivehub/rulebook@latest task list --archived      # List including archived tasks
npx @hivehub/rulebook@latest task show <task-id>       # Show task details
npx @hivehub/rulebook@latest task validate <task-id>    # Validate task format
npx @hivehub/rulebook@latest task archive <task-id>    # Archive completed task
npx @hivehub/rulebook@latest task archive --skip-validation <task-id>  # Archive without validation
npx @hivehub/rulebook@latest tasks [options]           # Legacy command (DEPRECATED - use 'task' commands)

# Skills Management (v2.0)
npx @hivehub/rulebook@latest skill list                 # List all available skills
npx @hivehub/rulebook@latest skill list --category languages  # Filter by category
npx @hivehub/rulebook@latest skill list --enabled       # Show only enabled skills
npx @hivehub/rulebook@latest skill add <skill-id>       # Enable a skill
npx @hivehub/rulebook@latest skill remove <skill-id>    # Disable a skill
npx @hivehub/rulebook@latest skill show <skill-id>      # Show skill details
npx @hivehub/rulebook@latest skill search <query>       # Search for skills

# Configuration
npx @hivehub/rulebook@latest config --show     # Show current config
npx @hivehub/rulebook@latest config --set key=value  # Set config value
npx @hivehub/rulebook@latest config --feature watcher --enable   # Enable feature
npx @hivehub/rulebook@latest config --feature agent --disable    # Disable feature
```

## Setup Modes

### Full Mode (Default)
Complete setup with all features: Task management, Watcher, MCP modules, comprehensive workflows.

### Minimal Mode
```bash
npx @hivehub/rulebook@latest init --minimal
```
Essentials only: README, LICENSE, tests/, basic CI. Perfect for small teams or initial adoption.

### Light Mode
```bash
npx @hivehub/rulebook@latest init --light
```
Bare minimum rules: no quality enforcement, no testing requirements, no linting. Use for quick prototypes or non-production projects.

## Supported Languages & Frameworks

**28 Languages**: TypeScript, JavaScript, Python, Rust, Go, Java, Kotlin, C, C++, C#, PHP, Ruby, Swift, Elixir, Dart, Scala, Haskell, Julia, R, Lua, Solidity, Zig, Erlang, Ada, SAS, Lisp, Objective-C, SQL

**17 Frameworks** (auto-detected):
- Backend: NestJS, Spring Boot, Laravel, Django, Flask, Ruby on Rails, Symfony, Zend
- Frontend: Angular, React, Vue, Nuxt, Next.js, jQuery
- Mobile: React Native, Flutter
- Desktop: Electron

## MCP Modules (12)

**Core**: Vectorizer • Synap • Context7 • GitHub MCP • Playwright

**Services**: Supabase • Notion • Atlassian • Serena • Figma • Grafana

### MCP Server for Task Management

Rulebook provides an MCP (Model Context Protocol) server that exposes task management functions, allowing AI models to manage tasks programmatically through MCP instead of executing terminal commands.

**Benefits:**
- ✅ Direct MCP integration - no shell command execution needed
- ✅ Structured error handling with proper error codes and messages
- ✅ Consistent interface with other MCP operations
- ✅ Better automation capabilities for AI agents
- ✅ Improved reliability compared to terminal command execution
- ✅ Automatic project detection - finds `.rulebook` by walking up directories (like git)
- ✅ Zero configuration - works out of the box after `rulebook mcp init`

**Quick Setup:**

```bash
# Initialize MCP configuration in your project (one-time setup)
npx @hivehub/rulebook@latest mcp init
```

This command:
- Adds `mcp` block to your `.rulebook` file
- Creates/updates `.cursor/mcp.json` automatically
- Server uses stdio transport (MCP standard)

**Available MCP Functions:**

- `rulebook_task_create` - Create a new task with OpenSpec-compatible format
  - Input: `taskId` (string), optional `proposal` object
  - Output: Task creation confirmation with path
- `rulebook_task_list` - List all tasks with optional filters
  - Input: `includeArchived` (boolean), `status` (enum)
  - Output: Array of tasks with metadata
- `rulebook_task_show` - Show detailed task information
  - Input: `taskId` (string)
  - Output: Complete task details including proposal, tasks, specs
- `rulebook_task_update` - Update task status or progress
  - Input: `taskId` (string), optional `status`, `progress`
  - Output: Update confirmation
- `rulebook_task_validate` - Validate task format against OpenSpec requirements
  - Input: `taskId` (string)
  - Output: Validation results with errors and warnings
- `rulebook_task_archive` - Archive completed task and apply spec deltas
  - Input: `taskId` (string), optional `skipValidation`
  - Output: Archive confirmation with archive path
- `rulebook_task_delete` - Delete a task permanently
  - Input: `taskId` (string)
  - Output: Deletion confirmation

**Total: 7 MCP functions** for complete task lifecycle management.

**Skills MCP Functions (v2.0):**

- `rulebook_skill_list` - List available skills with optional category filter
- `rulebook_skill_show` - Show detailed skill information
- `rulebook_skill_enable` - Enable a skill for the project
- `rulebook_skill_disable` - Disable a skill
- `rulebook_skill_search` - Search skills by name, description, or tags
- `rulebook_skill_validate` - Validate skills configuration

**Total: 13 MCP functions** (7 task + 6 skills).

## Skills System (v2.0)

Rulebook v2.0 introduces a modular skills system for AI-assisted development. Skills are pluggable capabilities that can be enabled or disabled per project.

### What are Skills?

Skills are YAML-frontmatter Markdown files that define specific capabilities or rules for AI assistants. Each skill has:

- **Metadata**: Name, description, version, category, tags, dependencies
- **Content**: Markdown content with rules, patterns, and examples

### Skill Categories

Skills are organized into 10 categories:

| Category | Description | Examples |
|----------|-------------|----------|
| `languages` | Language-specific rules | TypeScript, Rust, Python |
| `frameworks` | Framework conventions | NestJS, React, Django |
| `modules` | MCP module integration | Vectorizer, Context7 |
| `services` | Service integration | PostgreSQL, Redis |
| `workflows` | CI/CD patterns | GitHub Actions |
| `ides` | IDE configuration | Cursor, VS Code |
| `core` | Core rulebook standards | Quality gates |
| `cli` | AI CLI configuration | Claude Code, Codex |
| `git` | Git workflow rules | Branching, commits |
| `hooks` | Git hooks configuration | Pre-commit, pre-push |

### Using Skills

```bash
# List all available skills
rulebook skill list

# Filter by category
rulebook skill list --category languages

# Enable a skill
rulebook skill add languages/typescript

# Disable a skill
rulebook skill remove languages/typescript

# Show skill details
rulebook skill show languages/typescript

# Search for skills
rulebook skill search "testing"
```

### Auto-Detection

During `rulebook init` and `rulebook update`, skills are automatically detected and enabled based on your project's:

- Detected languages (e.g., TypeScript → `languages/typescript`)
- Detected frameworks (e.g., NestJS → `frameworks/nestjs`)
- Detected modules (e.g., Vectorizer → `modules/vectorizer`)
- Detected services (e.g., PostgreSQL → `services/postgresql`)

### Creating Custom Skills

Create a `SKILL.md` file in `templates/skills/<category>/<skill-name>/`:

```markdown
---
name: My Custom Skill
description: Description of what this skill does
version: 1.0.0
category: core
tags: ["custom", "example"]
---

# My Custom Skill

Add your rules and patterns here.
```

## Service Integration Templates (20)

Rulebook provides comprehensive integration templates for popular backend services, including databases, caches, message queues, and object storage.

**Relational Databases**: PostgreSQL • MySQL • MariaDB • SQL Server • Oracle • SQLite

**NoSQL Databases**: MongoDB • Cassandra • DynamoDB

**Caches**: Redis • Memcached

**Search & Analytics**: Elasticsearch

**Graph Databases**: Neo4j

**Time-Series Databases**: InfluxDB

**Message Queues**: RabbitMQ • Kafka

**Object Storage**: AWS S3 • Azure Blob Storage • Google Cloud Storage • MinIO

### Automatic Service Detection

The CLI automatically detects services in your project by analyzing:
- **`package.json`**: Database drivers and client libraries (e.g., `pg`, `mongoose`, `redis`, `ioredis`)
- **`.env` files**: Connection strings and environment variables (e.g., `POSTGRES_*`, `REDIS_*`, `MONGODB_*`)
- **`docker-compose.yml`**: Service definitions in Docker Compose files

### Service Templates Include

Each service template provides:
- Connection setup and configuration
- Basic CRUD operations (where applicable)
- Advanced patterns and best practices
- Docker Compose examples
- Environment variable configuration
- Development and testing integration
- Common pitfalls and solutions

Templates are generated in `/rulebook/[SERVICE].md` and referenced in `AGENTS.md` for easy access during development.

**Server Details:**
- **Transport**: stdio only - stdout contains ONLY JSON-RPC 2.0 messages
- **Configuration**: Loaded from `.rulebook` file automatically
- **Project Detection**: Finds `.rulebook` by walking up directories (like git)
- **Protocol**: MCP over stdio (MCP-compliant, no stdout pollution)

**Configuration:**

The MCP server configuration lives in your `.rulebook` file:

```json
{
  "mcp": {
    "enabled": true,
    "tasksDir": "rulebook/tasks",
    "archiveDir": "rulebook/archive"
  }
}
```

**Note:** The server uses stdio transport only (no configuration needed).

**Cursor Configuration (`.cursor/mcp.json`):**

After running `rulebook mcp init`, your `.cursor/mcp.json` will be automatically configured:

```json
{
  "mcpServers": {
    "rulebook": {
      "command": "npx",
      "args": ["-y", "@hivehub/rulebook@latest", "mcp-server"]
    }
  }
}
```

That's it! No need for `--project-root`, `--port`, or environment variables. The server automatically:
- Finds your `.rulebook` file by walking up directories
- Uses the `mcp` configuration from `.rulebook`
- Works from any subdirectory in your project

**Manual Override (if needed):**

If you need to override the `.rulebook` location:

```json
{
  "mcpServers": {
    "rulebook": {
      "command": "npx",
      "args": ["-y", "@hivehub/rulebook@latest", "mcp-server"],
      "env": {
        "RULEBOOK_CONFIG": "/path/to/.rulebook"
      }
    }
  }
}
```

**Note:** After running `rulebook mcp init` or updating `.cursor/mcp.json`, restart Cursor for the changes to take effect.

**Troubleshooting:**

### Server Not Starting

If the MCP server fails to start:

1. **Verify `.rulebook` exists**: Run `rulebook mcp init` in your project root
2. **Check Node.js version**: Requires Node.js 20+ (`node --version`)
3. **Verify MCP configuration**: Check that `.cursor/mcp.json` exists and is valid JSON
4. **Debug mode**: Set `RULEBOOK_MCP_DEBUG=1` to see debug logs in stderr:
   ```bash
   RULEBOOK_MCP_DEBUG=1 npx @hivehub/rulebook@latest mcp-server
   ```

### Empty Schemas or Missing Parameters

If tools don't show descriptions or parameters:

1. **Clear npm cache**:
```bash
# Clear npm cache
npm cache clean --force

# Or clear npx cache specifically
rm -rf ~/.npm/_npx
```

2. **Rebuild the project**:
```bash
npm run build
```

3. Restart your MCP client and try again.

### "Unexpected token" or "Invalid JSON" Errors

These errors occur when the server outputs non-JSON to stdout. This is fixed in v1.0.9+:
- Ensure you're using `@hivehub/rulebook@latest` (v1.0.9 or newer)
- stdout now contains ONLY JSON-RPC 2.0 messages
- All logs go to stderr (use `RULEBOOK_MCP_DEBUG=1` to see them)

### ".rulebook not found" Error

If you see this error:
1. Run `rulebook mcp init` in your project root
2. Or manually create `.rulebook` file with `mcp` block
3. Or set `RULEBOOK_CONFIG` environment variable to point to your `.rulebook` file

### "Received a response for an unknown message ID" Warning

If you see this warning in Cursor logs:
- **This is a cosmetic warning** - it does NOT affect functionality
- All tools work correctly despite this warning
- The server is responding correctly with valid JSON-RPC 2.0 messages
- This is a known issue with Cursor's MCP client ID tracking
- The warning can be safely ignored - all MCP tools function normally

### "Received a response for an unknown message ID" Warning

If you see this warning in the logs:
- This is usually harmless - the server is working correctly
- The warning appears during the initial handshake but doesn't affect functionality
- If you see "Successfully connected to stdio server" after the warning, everything is fine
- This is a known behavior with some MCP clients and can be safely ignored

**Automated Setup:**

```bash
# Initialize MCP in your project (recommended)
npx @hivehub/rulebook@latest mcp init

# Or use the setup script (for CI/CD)
npm run setup:mcp
```

## AI Tools Supported (23)

**IDEs**: Cursor, Windsurf, VS Code, GitHub Copilot, Tabnine, Replit, JetBrains AI, Zed

**CLI Agents**: Aider, Continue, Claude, Claude Code, Gemini, Cline, Amazon Q, Auggie, CodeBuddy, Factory, OpenCode, Kilo, Codex, Codeium, Cursor CLI

## Documentation

Full documentation available in `/docs`:
- [Getting Started](docs/guides/GETTING_STARTED.md)
- [Best Practices](docs/guides/BEST_PRACTICES.md)
- [CLI Agents](docs/CLI_AGENTS.md)
- [Roadmap](docs/ROADMAP.md)
- [Framework Templates](templates/frameworks/)

## Contributing

Contributions welcome! Node.js 18+ required.

```bash
npm install
npm test
npm run build
```

## License

Apache License 2.0 © HiveLLM Team

---

**Links**: [Issues](https://github.com/hivellm/rulebook/issues) • [Discussions](https://github.com/hivellm/rulebook/discussions)
