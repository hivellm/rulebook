# @hivellm/rulebook

> Standardize AI-generated projects with automated templates, quality gates, and framework detection for 28 languages.

## Quick Start

```bash
# New project (interactive)
npx @hivellm/rulebook init

# Minimal setup (essentials only)
npx @hivellm/rulebook init --minimal

# Update existing project
npx @hivellm/rulebook update
```

## Key Features

- 🔍 **Auto-Detection**: Detects languages, frameworks (NestJS, React, Spring, etc.), and MCP modules
- 🪝 **Git Hook Automation**: Optional pre-commit/pre-push hooks with language-aware quality checks
- 🎯 **Minimal Mode**: Quick setup with just README, LICENSE, tests/, and basic CI
- 📝 **86+ Templates**: Languages, frameworks, IDEs, workflows pre-configured
- 🤖 **AI-Optimized**: Works with 23 AI assistants (Cursor, Claude, Gemini, etc.)
- 📦 **Publication Ready**: CI/CD pipelines for npm, crates.io, PyPI, Maven Central, and more

## What It Does

**For New Projects:**
1. Detects your language(s), frameworks, and MCP modules
2. Asks setup questions (or use `--minimal` for defaults)
3. Generates AGENTS.md with AI assistant rules
4. Optionally installs Git hooks (pre-commit/pre-push)
5. Creates GitHub Actions workflows
6. Scaffolds README, LICENSE, /docs, and /tests

**For Existing Projects:**
```bash
npx @hivellm/rulebook update
```
Merges latest templates while preserving your customizations (auto-backup included).

## Commands

```bash
rulebook init              # Initialize new project
rulebook init --minimal    # Minimal setup (essentials only)
rulebook init --yes        # Skip prompts, use defaults
rulebook update            # Update to latest templates
rulebook validate          # Check project standards
rulebook health            # Project health score
rulebook fix               # Auto-fix common issues
rulebook generate-docs     # Create /docs structure
```

**Advanced (beta):**
```bash
rulebook watcher           # Real-time task monitoring
rulebook agent             # Autonomous workflow automation
rulebook tasks             # OpenSpec task management
```

## Setup Modes

### Full Mode (Default)
Complete setup with all features: OpenSpec tasks, Watcher, MCP modules, comprehensive workflows.

### Minimal Mode
```bash
rulebook init --minimal
```
Essentials only: README, LICENSE, tests/, basic CI. Perfect for small teams or initial adoption.

## Supported Languages & Frameworks

**28 Languages**: TypeScript, JavaScript, Python, Rust, Go, Java, Kotlin, C, C++, C#, PHP, Ruby, Swift, Elixir, Dart, Scala, Haskell, Julia, R, Lua, Solidity, Zig, Erlang, Ada, SAS, Lisp, Objective-C, SQL

**7 Frameworks** (auto-detected):
- Backend: NestJS, Spring Boot, Laravel
- Frontend: Angular, React, Vue, Nuxt

## MCP Modules (12)

**Core**: Vectorizer • Synap • OpenSpec • Context7 • GitHub MCP • Playwright

**Services**: Supabase • Notion • Atlassian • Serena • Figma • Grafana

## AI Tools Supported (23)

**IDEs**: Cursor, Windsurf, VS Code, GitHub Copilot, Tabnine, Replit, JetBrains AI, Zed

**CLI Agents**: Aider, Continue, Claude, Claude Code, Gemini, Cline, Amazon Q, Auggie, CodeBuddy, Factory, OpenCode, Kilo, Codex, Codeium, Cursor CLI

## Documentation

Full documentation available in `/docs`:
- [Architecture](docs/ARCHITECTURE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [CLI Reference](docs/CLI.md)
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
