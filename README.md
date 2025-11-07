# @hivellm/rulebook

[![npm version](https://img.shields.io/npm/v/@hivellm/rulebook?logo=npm&logoColor=white)](https://www.npmjs.com/package/@hivellm/rulebook)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
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
- 📊 **Task Organization**: Integrates with OpenSpec for structured task management and project planning

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

## What's New in v0.17.2

- 🔒 **Safety Directive**: All generated `AGENTS.md` now forbid destructive `rm -rf` usage and require `git submodule add` for submodule creation, keeping repos safe when agents automate tasks.
- ⚙️ **Generator Updates**: `rulebook init` and `rulebook update` embed the directive automatically so fresh scaffolds and updates stay aligned.
- 🗂️ **Template Sync**: Bundled rulebooks (`rulebook/AGENTS.md`) updated to match the new directive, ensuring templates and live projects never drift.

> Looking for the CI/CD workflow overhaul? See the [v0.17.1 notes](docs/RELEASE_NOTES.md#version-0171---2025-11-06).

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
- 🎯 **Minimal Mode**: Quick setup with just README, LICENSE, tests/, and basic CI
- 📝 **86+ Templates**: Languages, frameworks, IDEs, workflows pre-configured
- 🤖 **AI-Optimized**: Works with 23 AI assistants (Cursor, Claude, Gemini, etc.)
- 📦 **Publication Ready**: CI/CD pipelines for npm, crates.io, PyPI, Maven Central, and more
- 🔄 **Automatic Migration**: Existing projects automatically migrated to modular structure

## What It Does

**For New Projects:**
1. Detects your language(s), frameworks, and MCP modules
2. Asks setup questions (or use `--minimal` for defaults)
3. Generates AGENTS.md with AI assistant rules (modular structure)
4. Creates `/rulebook/` directory with language/framework/module templates
5. Optionally installs Git hooks (pre-commit/pre-push)
6. Creates GitHub Actions workflows
7. Scaffolds README, LICENSE, /docs, and /tests

**For Existing Projects:**
```bash
npx @hivellm/rulebook update
```
- Automatically migrates embedded templates to modular `/rulebook/` structure
- Merges latest templates while preserving your customizations
- Updates AGENTS.md with references to modular files

## Commands

### Core Commands

```bash
# Project Initialization & Updates
rulebook init              # Initialize new project (interactive)
rulebook init --minimal    # Minimal setup (essentials only)
rulebook init --light      # Light mode (no quality enforcement)
rulebook init --yes        # Skip prompts, use defaults
rulebook update            # Update AGENTS.md to latest version
rulebook update --yes      # Update without confirmation
rulebook update --light    # Update in light mode

# Workflow & CI/CD
rulebook workflows         # Generate GitHub Actions workflows

# Validation & Health
rulebook validate          # Check project standards
rulebook health            # Project health score (0-100)
rulebook fix               # Auto-fix common issues

# Documentation
rulebook generate-docs     # Create /docs structure
rulebook generate-docs --yes  # Skip prompts, use defaults

# Dependencies & Coverage
rulebook check-deps        # Check outdated/vulnerable dependencies
rulebook check-coverage    # Check test coverage (default: 95%)
rulebook check-coverage -t 80  # Custom threshold

# Versioning
rulebook version <type>    # Bump version (major|minor|patch)
rulebook changelog         # Generate changelog from git commits
rulebook changelog -v 1.0.0  # Specify version
```

### Advanced Commands (Beta)

```bash
# Real-time Monitoring
rulebook watcher           # Full-screen task monitoring UI
                          # - Live task progress tracking
                          # - Activity log with timestamps
                          # - System status monitoring
                          # - Auto-refresh every 2 seconds

# Autonomous Agent
rulebook agent             # Start AI CLI workflow automation
rulebook agent --dry-run   # Simulate without changes
rulebook agent --tool cursor-agent  # Specify CLI tool
rulebook agent --iterations 10      # Max iterations
rulebook agent --watch     # Enable watcher mode

# Task Management
rulebook tasks             # Manage OpenSpec tasks
rulebook tasks --tree      # Show dependency tree
rulebook tasks --current   # Show active task
rulebook tasks --status <id>  # Update task status

# Configuration
rulebook config --show     # Show current config
rulebook config --set key=value  # Set config value
rulebook config --feature watcher --enable   # Enable feature
rulebook config --feature agent --disable    # Disable feature
```

## Setup Modes

### Full Mode (Default)
Complete setup with all features: OpenSpec tasks, Watcher, MCP modules, comprehensive workflows.

### Minimal Mode
```bash
rulebook init --minimal
```
Essentials only: README, LICENSE, tests/, basic CI. Perfect for small teams or initial adoption.

### Light Mode
```bash
rulebook init --light
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

**Core**: Vectorizer • Synap • OpenSpec • Context7 • GitHub MCP • Playwright

**Services**: Supabase • Notion • Atlassian • Serena • Figma • Grafana

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

MIT © HiveLLM Team

---

**Links**: [Issues](https://github.com/hivellm/rulebook/issues) • [Discussions](https://github.com/hivellm/rulebook/discussions)
