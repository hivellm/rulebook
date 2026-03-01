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

> Standardize AI-generated projects with automated templates, quality gates, persistent memory, and framework detection for 28 languages, 17 frameworks, 13 MCP modules, and 20 services.

---

## Why Rulebook?

Large Language Models (LLMs) for software development need **clear directives** to generate high-quality code consistently. Without standardized guidelines, AI-generated code can be inconsistent, error-prone, and difficult to maintain.

**Rulebook solves this by providing:**

- 📋 **Comprehensive Rule Sets**: Language-specific guidelines (TypeScript, Rust, Python, etc.), framework conventions (NestJS, Django, React), testing standards, linting rules, spell-checking, CI/CD pipelines, Git hooks, and version control best practices
- 🤖 **Ralph Autonomous Loop**: Multi-iteration AI agent task solving with quality gates (type-check, lint, tests, coverage), iteration tracking, learnings extraction, and graceful pause/resume
- 🧠 **Persistent Memory**: Context that survives across AI sessions with hybrid BM25+HNSW search, zero native dependencies
- 🎯 **Normalized Deliverables**: Ensures consistent code quality across all AI-generated outputs
- 🛡️ **Error Reduction**: Catches issues early through automated quality gates and pre-commit/pre-push hooks
- ⚙️ **Process Automation**: Automates repetitive tasks like formatting, testing, and deployment
- 🔌 **MCP Integration**: 19 MCP functions for task management, skills, and persistent memory
- 📊 **Task Management**: Built-in task management system (OpenSpec-compatible format) for structured development

By giving LLMs a clear "rulebook" to follow, you ensure that every piece of generated code meets your project's standards—**automatically**.

## Quick Start

```bash
# New project — auto-detects languages, frameworks, services (no prompts)
npx @hivehub/rulebook@latest init

# Minimal setup (essentials only)
npx @hivehub/rulebook@latest init --minimal

# Lean mode — AGENTS.md as <3KB index (fast AI loading)
npx @hivehub/rulebook@latest init --lean

# Update existing project
npx @hivehub/rulebook@latest update
```

## What's New

See the full [CHANGELOG](CHANGELOG.md) for details.

### v4.0.0 — AI-first DX & Ralph maturity

- 🚀 **Zero-prompt `init`**: auto-configures from detection, no questionnaires
- 🛡️ **AGENTS.override.md**: project rules that survive every update
- 📊 **Health Scorer v2**: 9-category scoring with letter grade A–F
- 🤖 **Ralph v2**: parallel execution, plan checkpoint, context compression, security gate, GitHub Issues import
- 🐳 **Container + Observability**: Docker, K8s, Helm, Sentry, OTel, Datadog, Pino, Winston, Prometheus
- 🛠️ **Multi-tool**: Gemini CLI, Continue.dev, Windsurf, Copilot configs auto-generated
- 🔍 **AI Code Review**: `rulebook review` + GitHub Actions workflow
- 👥 **Multi-agent teams**: Claude Code agent definitions + team auto-configuration

### v3.0.0 — Persistent Memory & Skills

- 🧠 **Persistent Memory**: zero-dependency BM25+HNSW hybrid search, SQLite/WASM, 7 memory types
- 🧩 **Skills System**: 244 skills across 10 categories with auto-detection and YAML frontmatter
- 🤖 **Ralph Autonomous Loop**: multi-iteration AI agent with quality gates, PRD, pause/resume

### v2.0.0 — Multi-tool & MCP

- 🔌 **MCP Server**: 19 functions for task management, skills, and memory
- 🤖 **AI CLI configs**: CLAUDE.md, CODEX.md, GEMINI.md auto-generated
- 🧩 **Skills**: modular enable/disable architecture

### v1.0.0 — Foundation

- 📋 **Task management**: OpenSpec-compatible format with full lifecycle
- 🛡️ **Git hooks**: pre-commit (format, lint, type-check) + pre-push (build, tests)
- 🌍 **28 languages, 17 frameworks**, auto-detection with confidence scores

---

## Persistent Memory System

> **NEW in v3.0.0** — Give your AI assistant a brain that persists across sessions.

Every time you open a new tab or restart your editor, the AI loses all context about your project. Rulebook's persistent memory solves this — decisions, bugs, discoveries, and preferences are stored locally and searchable across sessions.

### How It Works

```
Session 1: "Let's use sql.js instead of better-sqlite3 for zero native deps"
  → Saved to memory automatically

Session 2 (new tab, days later):
  AI searches memory → finds the decision → continues with full context
```

### Architecture

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Storage** | SQLite via sql.js WASM | Zero native compilation, works everywhere |
| **Keyword Search** | BM25 | Fast exact-match scoring |
| **Vector Search** | HNSW index | Semantic similarity matching |
| **Embeddings** | TF-IDF + FNV1a hashing | 256-dim vectors, pure TypeScript, no API calls |
| **Ranking** | Reciprocal Rank Fusion | Combines BM25 + vector scores |
| **Eviction** | LRU cache | 500MB default, protects decision/bugfix memories |
| **Privacy** | Auto-redact filter | `<private>...</private>` tags stripped before storage |

### Memory Types

| Type | When to Use |
|------|-------------|
| `decision` | Chose one approach over another |
| `bugfix` | Root cause and resolution |
| `feature` | What was built, key design choices |
| `discovery` | Codebase patterns, gotchas, constraints |
| `refactor` | Structural changes and reasoning |
| `change` | Configuration or dependency updates |
| `observation` | Session summaries, general notes |

### Auto-Capture

Tool interactions are captured automatically — when the AI creates a task, updates a status, enables a skill, etc., the memory system records it without any manual action.

For conversation context (decisions, discussions, user preferences), the AI saves manually following the mandatory directives in `CLAUDE.md` and `AGENTS.md`.

### Usage

**CLI Commands:**
```bash
rulebook memory search "authentication approach"   # Hybrid BM25+vector search
rulebook memory save "Chose JWT over sessions"     # Save manually
rulebook memory stats                               # DB size, count, health
rulebook memory cleanup                             # Evict old memories
rulebook memory export                              # Export as JSON/CSV
```

**MCP Tools (used by AI agents):**
```
rulebook_memory_save      — Save context with type, title, content, tags
rulebook_memory_search    — Hybrid search (bm25/vector/hybrid modes)
rulebook_memory_get       — Get full details by memory ID
rulebook_memory_timeline  — Chronological context around a memory
rulebook_memory_stats     — Database statistics and health
rulebook_memory_cleanup   — Force eviction and cleanup
```

### Configuration

Memory is enabled in `.rulebook`:

```json
{
  "memory": {
    "enabled": true,
    "autoCapture": true,
    "dbPath": ".rulebook/memory/memory.db",
    "maxSizeBytes": 524288000,
    "vectorDimensions": 256
  }
}
```

> Add `.rulebook/` to your `.gitignore` — memory is local per developer.

---

## Key Features

- 🤖 **Ralph Autonomous Loop**: Multi-iteration AI task solving with fresh context per iteration (v3.1+)
  - Quality gates: type-check, lint, tests, coverage verification
  - Graceful pause/resume capabilities
  - Complete iteration history and metrics
  - 6 CLI commands + 4 MCP tools
- 🧠 **Persistent Memory**: Context that survives across AI sessions — hybrid BM25+HNSW search, auto-capture, zero native dependencies
- 🔍 **Auto-Detection**: Detects languages, frameworks, MCP modules, and services from your project files
- 📁 **Modular Architecture**: Templates in `/.rulebook/` directory — smaller AGENTS.md, on-demand loading
- 🔗 **Git Hook Automation**: Pre-commit/pre-push hooks with language-aware quality checks
- 🔌 **23 MCP Functions**: Task management (7), skills (6), persistent memory (6), Ralph loop (4) via Model Context Protocol
- 📝 **106+ Templates**: 28 languages, 17 frameworks, 8 IDEs, 20 services, 15 CLI agents
- 🤖 **AI-Optimized**: Works with 23 AI assistants (Cursor, Claude, Gemini, etc.)
- 📦 **Publication Ready**: CI/CD pipelines for npm, crates.io, PyPI, Maven Central, and more
- 🔄 **Automatic Migration**: Existing projects automatically migrated to modular structure

## What It Does

**For New Projects:**
1. Detects your language(s), frameworks, MCP modules, and services
2. Asks setup questions (or use `--minimal` for defaults)
3. Generates AGENTS.md with AI assistant rules (modular structure)
4. Creates `/.rulebook/` directory with language/framework/module/service templates
5. Creates/updates `.gitignore` automatically for detected languages
6. Auto-configures Claude Code integration (MCP + skills) if detected
7. Optionally installs Git hooks (pre-commit/pre-push)
8. Creates GitHub Actions workflows
9. Scaffolds README, LICENSE, /docs, and /tests

**For Existing Projects:**
```bash
npx @hivehub/rulebook update
```
- Automatically migrates embedded templates to modular `/.rulebook/` structure
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

# Persistent Memory (v3.0)
npx @hivehub/rulebook@latest memory search <query>    # Search memories (hybrid BM25+vector)
npx @hivehub/rulebook@latest memory save <text>        # Save a memory
npx @hivehub/rulebook@latest memory list               # List all memories
npx @hivehub/rulebook@latest memory stats              # Database stats and health
npx @hivehub/rulebook@latest memory cleanup            # Run cache eviction
npx @hivehub/rulebook@latest memory export             # Export as JSON or CSV

# Ralph Autonomous Loop (v3.1)
npx @hivehub/rulebook@latest ralph init                # Initialize Ralph and generate PRD
npx @hivehub/rulebook@latest ralph run                 # Execute autonomous iteration loop
npx @hivehub/rulebook@latest ralph run --max-iterations 10  # Set max iterations
npx @hivehub/rulebook@latest ralph run --tool claude   # Specify AI tool (claude|amp|gemini)
npx @hivehub/rulebook@latest ralph status              # Show loop status
npx @hivehub/rulebook@latest ralph history             # View iteration history
npx @hivehub/rulebook@latest ralph history --limit 5   # Last N iterations
npx @hivehub/rulebook@latest ralph pause               # Gracefully pause loop
npx @hivehub/rulebook@latest ralph resume              # Resume from pause

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

## MCP Modules (13)

**Core**: Vectorizer • Synap • Context7 • GitHub MCP • Playwright • Memory

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

> **Note**: `rulebook init` and `rulebook update` automatically detect Claude Code and configure `.mcp.json` at the project root + install skills to `.claude/commands/`. No manual setup needed for Claude Code users.

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

**Memory MCP Functions (v3.0):**

- `rulebook_memory_search` - Hybrid BM25+vector search with mode selection (hybrid/bm25/vector)
- `rulebook_memory_timeline` - Chronological context around a specific memory
- `rulebook_memory_get` - Full details for specific memory IDs
- `rulebook_memory_save` - Save new memories with type, title, content, and tags
- `rulebook_memory_stats` - Database statistics (size, count, usage, health)
- `rulebook_memory_cleanup` - Force eviction and cleanup

**Total: 19 MCP functions** (7 task + 6 skills + 6 memory).

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

Templates are generated in `/.rulebook/specs/[SERVICE].md` and referenced in `AGENTS.md` for easy access during development.

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
    "tasksDir": ".rulebook/tasks",
    "archiveDir": ".rulebook/archive"
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

## Acknowledgments

We gratefully acknowledge and draw inspiration from these excellent open-source projects:

### [Ralph - Autonomous AI Agent Loop](https://github.com/snarktank/ralph)
Ralph inspired the autonomous loop integration in Rulebook v3.1+, enabling multi-iteration AI task solving with fresh context per iteration. We adapted Ralph's architectural patterns for integration with the Rulebook task management system, enabling AI agents to solve complex problems across multiple iterations without context exhaustion.

### [OpenSpec - AI-Native Task Format](https://github.com/Fission-AI/openspec)
OpenSpec's innovative approach to AI-native task management influenced Rulebook's task structure, including:
- Delta-based specifications (ADDED/MODIFIED/REMOVED)
- Given/When/Then scenario definitions
- Requirement-focused organization
- Structured task metadata and tracking

Rulebook builds on these concepts to provide a comprehensive task management system that works seamlessly with AI agents while maintaining compatibility with the OpenSpec format.

### Special Thanks

- **Ralph Team** for pioneering autonomous AI iteration patterns
- **Fission AI** for the OpenSpec format that standardizes AI task management
- All contributors who have helped shape Rulebook into a comprehensive solution for AI-generated project standardization

These projects demonstrate that with clear structure and standards, AI agents can consistently deliver high-quality code and documentation.

## License

Apache License 2.0 © HiveLLM Team

---

**Links**: [Issues](https://github.com/hivellm/rulebook/issues) • [Discussions](https://github.com/hivellm/rulebook/discussions) • [Ralph](https://github.com/snarktank/ralph) • [OpenSpec](https://github.com/Fission-AI/openspec)
