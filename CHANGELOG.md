# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project structure and scaffolding
- Expanded allowed root-level files to include:
  - `LICENSE` - Project license
  - `CONTRIBUTING.md` - Contribution guidelines
  - `CODE_OF_CONDUCT.md` - Code of conduct
  - `SECURITY.md` - Security policy
- Auto-detection for Rust, TypeScript, and Python projects
- IDE templates:
  - CURSOR.md - Cursor IDE specific rules and patterns
  - WINDSURF.md - Windsurf IDE specific rules and patterns
  - VSCODE.md - VS Code with AI extensions rules
  - COPILOT.md - GitHub Copilot specific instructions
- CLI agent templates:
  - AIDER.md - Aider CLI pair programming rules
  - CONTINUE.md - Continue CLI/extension rules
  - CLAUDE.md - Claude Code/API CLI rules
  - GEMINI.md - Google Gemini CLI rules
  - CURSOR_CLI.md - Cursor CLI automation rules
  - CODEIUM.md - Codeium CLI/extension rules
- MCP module detection (Vectorizer, Synap, OpenSpec, Context7)
- Interactive CLI with prompts for project configuration
- Template system for languages, modules, IDEs, and workflows
- Smart AGENTS.md generation with block-based structure
- Intelligent merging with existing AGENTS.md files
- .rulesignore support for selective rule disabling
- Language templates:
  - Rust (Edition 2024, Clippy, rustfmt, testing)
  - TypeScript (ESLint, Prettier, Vitest)
  - Python (Ruff, Black, mypy, pytest)
- Module templates:
  - Vectorizer (semantic search patterns)
  - Synap (KV store usage patterns)
  - OpenSpec (proposal workflow)
  - Context7 (dependency management)
- GitHub Actions workflow templates:
  - Rust: test, lint, codespell
  - TypeScript: test, lint
  - Python: test, lint
- Comprehensive test suite (95%+ coverage)
- Documentation structure enforcement
- NPX-compatible CLI tool

## [0.1.0] - 2024-01-01

### Added
- Initial release
- Basic project detection
- AGENTS.md generation
- Template system
- CLI interface

