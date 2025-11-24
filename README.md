# @hivellm/rulebook

[![npm version](https://img.shields.io/npm/v/@hivellm/rulebook?logo=npm&logoColor=white)](https://www.npmjs.com/package/@hivellm/rulebook)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[![Languages](https://img.shields.io/badge/languages-28-orange?logo=codefactor&logoColor=white)](#supported-languages--frameworks)
[![Frameworks](https://img.shields.io/badge/frameworks-17-blueviolet?logo=framework&logoColor=white)](#supported-languages--frameworks)
[![Templates](https://img.shields.io/badge/templates-86+-green?logo=files&logoColor=white)](templates/)
[![MCP Modules](https://img.shields.io/badge/MCP%20modules-12-purple?logo=module&logoColor=white)](#mcp-modules-12)

[![AI Tools](https://img.shields.io/badge/AI%20tools-23-yellow?logo=openai&logoColor=white)](#ai-tools-supported-23)
[![Git Hooks](https://img.shields.io/badge/git%20hooks-automated-success?logo=git&logoColor=white)](#key-features)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-ready-informational?logo=githubactions&logoColor=white)](#what-it-does)

> Standardize AI-generated projects with automated templates, quality gates, and framework detection for 28 languages.

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
npx @hivellm/rulebook@latest init

# Minimal setup (essentials only)
npx @hivellm/rulebook@latest init --minimal

# Light mode (prototypes without strict rules)
npx @hivellm/rulebook@latest init --light

# Update existing project
npx @hivellm/rulebook@latest update
```

## What's New

### v1.0.3 (Latest)

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
  - 6 MCP functions: create, list, show, update, validate, archive tasks
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

- 🔍 **Auto-Detection**: Detects languages, frameworks (NestJS, React, Spring, etc.), and MCP modules
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
- 📝 **86+ Templates**: Languages, frameworks, IDEs, workflows pre-configured
- 🤖 **AI-Optimized**: Works with 23 AI assistants (Cursor, Claude, Gemini, etc.)
- 📦 **Publication Ready**: CI/CD pipelines for npm, crates.io, PyPI, Maven Central, and more
- 🔄 **Automatic Migration**: Existing projects automatically migrated to modular structure and OpenSpec tasks

## What It Does

**For New Projects:**
1. Detects your language(s), frameworks, and MCP modules
2. Asks setup questions (or use `--minimal` for defaults)
3. Generates AGENTS.md with AI assistant rules (modular structure)
4. Creates `/rulebook/` directory with language/framework/module templates
5. Creates/updates `.gitignore` automatically for detected languages
6. Optionally installs Git hooks (pre-commit/pre-push)
7. Creates GitHub Actions workflows
8. Scaffolds README, LICENSE, /docs, and /tests

**For Existing Projects:**
```bash
npx @hivellm/rulebook update
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
npx @hivellm/rulebook@latest init              # Initialize new project (interactive)
npx @hivellm/rulebook@latest init --minimal    # Minimal setup (essentials only)
npx @hivellm/rulebook@latest init --light       # Light mode (no quality enforcement)
npx @hivellm/rulebook@latest init --yes         # Skip prompts, use defaults
npx @hivellm/rulebook@latest update             # Update AGENTS.md to latest version
npx @hivellm/rulebook@latest update --yes      # Update without confirmation
npx @hivellm/rulebook@latest update --light    # Update in light mode

# Workflow & CI/CD
npx @hivellm/rulebook@latest workflows         # Generate GitHub Actions workflows

# Validation & Health
npx @hivellm/rulebook@latest validate          # Check project standards
npx @hivellm/rulebook@latest health            # Project health score (0-100)
npx @hivellm/rulebook@latest fix               # Auto-fix common issues

# Documentation
npx @hivellm/rulebook@latest generate-docs      # Create /docs structure
npx @hivellm/rulebook@latest generate-docs --yes  # Skip prompts, use defaults

# Dependencies & Coverage
npx @hivellm/rulebook@latest check-deps       # Check outdated/vulnerable dependencies
npx @hivellm/rulebook@latest check-coverage   # Check test coverage (default: 95%)
npx @hivellm/rulebook@latest check-coverage -t 80  # Custom threshold

# Versioning
npx @hivellm/rulebook@latest version <type>   # Bump version (major|minor|patch)
npx @hivellm/rulebook@latest changelog        # Generate changelog from git commits
npx @hivellm/rulebook@latest changelog -v 1.0.0  # Specify version
```

> **Note**: If installed globally (`npm install -g @hivellm/rulebook`), you can use `rulebook` directly instead of `npx @hivellm/rulebook@latest`.

### Advanced Commands (Beta)

```bash
# Real-time Monitoring
npx @hivellm/rulebook@latest watcher           # Full-screen task monitoring UI
                                                # - Live task progress tracking
                                                # - Activity log with timestamps
                                                # - System status monitoring
                                                # - Auto-refresh every 2 seconds

# Autonomous Agent
npx @hivellm/rulebook@latest agent             # Start AI CLI workflow automation
npx @hivellm/rulebook@latest agent --dry-run   # Simulate without changes
npx @hivellm/rulebook@latest agent --tool cursor-agent  # Specify CLI tool
npx @hivellm/rulebook@latest agent --iterations 10      # Max iterations
npx @hivellm/rulebook@latest agent --watch     # Enable watcher mode

# Task Management
npx @hivellm/rulebook@latest task create <task-id>     # Create new task
npx @hivellm/rulebook@latest task list                 # List all tasks
npx @hivellm/rulebook@latest task list --archived      # List including archived tasks
npx @hivellm/rulebook@latest task show <task-id>       # Show task details
npx @hivellm/rulebook@latest task validate <task-id>    # Validate task format
npx @hivellm/rulebook@latest task archive <task-id>    # Archive completed task
npx @hivellm/rulebook@latest task archive --skip-validation <task-id>  # Archive without validation
npx @hivellm/rulebook@latest tasks [options]           # Legacy command (DEPRECATED - use 'task' commands)

# Configuration
npx @hivellm/rulebook@latest config --show     # Show current config
npx @hivellm/rulebook@latest config --set key=value  # Set config value
npx @hivellm/rulebook@latest config --feature watcher --enable   # Enable feature
npx @hivellm/rulebook@latest config --feature agent --disable    # Disable feature
```

## Setup Modes

### Full Mode (Default)
Complete setup with all features: Task management, Watcher, MCP modules, comprehensive workflows.

### Minimal Mode
```bash
npx @hivellm/rulebook@latest init --minimal
```
Essentials only: README, LICENSE, tests/, basic CI. Perfect for small teams or initial adoption.

### Light Mode
```bash
npx @hivellm/rulebook@latest init --light
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

**Start the MCP server:**

```bash
# Via npx (recommended)
npx @hivellm/rulebook@latest mcp-server

# Or using the binary directly
npx rulebook-mcp

# Or via npm script (if installed locally)
npm run mcp-server

# Or via CLI command with custom port
npx @hivellm/rulebook@latest mcp-server --project-root /path/to/project --port 8080

# Using environment variable for port
MCP_PORT=8080 npx @hivellm/rulebook@latest mcp-server
```

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

The server runs as an HTTP server and can be integrated with any MCP-compatible client that supports HTTP transport (Cursor, Claude Desktop, etc.).

**Server Details:**
- **Transport**: HTTP (StreamableHTTPServerTransport)
- **Default Port**: 30000 (configurable via `--port` or `MCP_PORT` environment variable)
- **Endpoint**: `http://localhost:30000/mcp`
- **Protocol**: MCP over HTTP

**Starting the Server:**

```bash
# Start server on default port (30000)
npx @hivellm/rulebook@latest mcp-server

# Start server on custom port
npx @hivellm/rulebook@latest mcp-server --port 30001

# With custom project root
npx @hivellm/rulebook@latest mcp-server --project-root /path/to/project --port 30000
```

**Configuration (mcp.json):**

For HTTP-based MCP clients, configure the server URL. The location depends on your client:

- **Cursor**: `~/.cursor/mcp.json` or `.cursor/mcp.json` in your project
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

**Example configuration (HTTP transport):**

```json
{
  "mcpServers": {
    "rulebook": {
      "url": "http://localhost:30000/mcp"
    }
  }
}
```

**Alternative configuration (using command to start server):**

If your client supports starting the server automatically:

```json
{
  "mcpServers": {
    "rulebook": {
      "command": "npx",
      "args": [
        "-y",
        "@hivellm/rulebook@latest",
        "mcp-server",
        "--port",
        "30000"
      ],
      "env": {
        "MCP_PORT": "30000"
      }
    }
  }
}
```

**With custom project root:**

```json
{
  "mcpServers": {
    "rulebook": {
      "command": "npx",
      "args": [
        "-y",
        "@hivellm/rulebook@latest",
        "mcp-server",
        "--project-root",
        "/path/to/your/project",
        "--port",
        "30000"
      ],
      "env": {
        "MCP_PORT": "30000"
      }
    }
  }
}
```

**Note:** After adding the configuration, restart your MCP client (Cursor or Claude Desktop) for the changes to take effect.

**Troubleshooting:**

### Empty Schemas or Missing Parameters

If tools don't show descriptions or parameters:

1. **Clear npm cache**:
```bash
# Clear npm cache
npm cache clean --force

# Or clear npx cache specifically
rm -rf ~/.npm/_npx
```

3. **Rebuild the project**:
```bash
npm run build
```

4. Restart your MCP client and try again.

### Connection Errors

If you encounter connection errors, verify:
- Node.js version is 20+ (`node --version`)
- MCP configuration file exists and is valid JSON
- Server is running: `npx @hivellm/rulebook@latest mcp-server`
- Server is accessible at `http://localhost:30000/mcp` (or your configured port)
- Port is not already in use (change with `--port` if needed)
- Firewall allows connections to the server port

**Automated Setup (CI/CD):**

The MCP configuration can be automatically created during CI builds:

```bash
# Setup MCP config automatically (detects IDE from environment)
npm run setup:mcp

# Or specify IDE explicitly
MCP_IDE=cursor npm run setup:mcp
MCP_IDE=claude npm run setup:mcp
```

In GitHub Actions workflows, the MCP configuration is automatically created when the build step runs. Set the `MCP_IDE` environment variable to configure for a specific IDE (defaults to `cursor`).

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
