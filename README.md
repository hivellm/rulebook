# @hivellm/rulebook

CLI tool to standardize AI-generated projects with templates, rules enforcement, workflow generation, and documentation structure for multiple languages and IDEs.

## Features

- 🔍 **Auto-Detection**: Automatically detects project language (Rust, TypeScript, Python) and MCP modules
- 📝 **Template System**: Pre-built templates for languages, modules, IDEs, and GitHub workflows
- 🔄 **Smart Merging**: Intelligently merges with existing AGENTS.md files without losing content
- 🎯 **Customizable**: Configure coverage thresholds, documentation strictness, and more
- 🚫 **Rules Ignore**: Selectively disable rules using `.rulesignore` file
- 🤖 **AI-Optimized**: Generates rules specifically designed for AI assistants (Cursor, Windsurf, etc.)

## Installation

```bash
# NPX (recommended - no installation needed)
npx @hivellm/rulebook init

# Or install globally
npm install -g @hivellm/rulebook
rulebook init

# Or install locally
npm install --save-dev @hivellm/rulebook
npx rulebook init
```

## Quick Start

Navigate to your project directory and run:

```bash
npx @hivellm/rulebook init
```

The CLI will:
1. Detect your project's language(s) and structure
2. Detect available MCP modules (Vectorizer, Synap, etc.)
3. Ask configuration questions
4. Generate or merge AGENTS.md with best practices
5. Optionally generate GitHub Actions workflows

## Usage

### Interactive Mode

```bash
npx @hivellm/rulebook init
```

Answer the prompts to customize your configuration:
- Language selection
- Project type (application, library, CLI, monorepo)
- MCP modules to include
- IDE preferences
- Coverage threshold (default: 95%)
- Documentation strictness

### Auto Mode

Use detected defaults without prompts:

```bash
npx @hivellm/rulebook init --yes
```

### Validation

Validate your project structure against rulebook standards:

```bash
npx @hivellm/rulebook validate
```

**Checks**:
- AGENTS.md presence and quality
- Documentation structure (/docs directory)
- Tests directory existence
- .rulesignore patterns
- Project quality score (0-100)

## Supported Languages

- ✅ **Rust**: Edition 2024, Clippy, Cargo fmt, nextest, llvm-cov
- ✅ **TypeScript**: ESLint, Prettier, Vitest, strict mode
- ✅ **Python**: Ruff, Black, mypy, pytest
- ✅ **Go**: gofmt, golangci-lint, go vet, table-driven tests
- ✅ **Java**: Maven/Gradle, JUnit 5, Checkstyle, PMD, SpotBugs, Jacoco

## Supported MCP Modules

- ✅ **Vectorizer**: Semantic search and codebase exploration
- ✅ **Synap**: Key-value store for task and data persistence
- ✅ **OpenSpec**: Change proposal and specification workflow
- ✅ **Context7**: Library documentation for dependency management

## Supported IDEs & AI Tools

### IDEs
- ✅ **Cursor**: Cursor-specific rules format (Agent mode, Composer)
- ✅ **Windsurf**: Windsurf configuration (Cascade AI, Flow State)
- ✅ **VS Code**: VS Code AI extensions (Copilot, Cody, Continue)
- ✅ **GitHub Copilot**: Copilot instructions and best practices

### CLI & API Agents
- ✅ **Aider**: AI pair programming in terminal
- ✅ **Continue**: Open-source Copilot alternative
- ✅ **Claude Code**: Anthropic Claude API/CLI (200K context)
- ✅ **Gemini**: Google Gemini API/CLI (2M context)
- ✅ **Cursor CLI**: Cursor automation and scripting
- ✅ **Codeium**: Free AI coding assistant

## Documentation Structure

Rulebook enforces a clean documentation structure:

```
project/
├── README.md           # Project overview (allowed in root)
├── CHANGELOG.md        # Version history (allowed in root)
├── AGENTS.md          # AI assistant rules (allowed in root)
├── LICENSE            # Project license (allowed in root)
├── CONTRIBUTING.md    # Contribution guidelines (allowed in root)
├── CODE_OF_CONDUCT.md # Code of conduct (allowed in root)
├── SECURITY.md        # Security policy (allowed in root)
└── docs/              # All other documentation
    ├── ROADMAP.md     # Implementation timeline
    ├── DAG.md         # Component dependencies
    ├── ARCHITECTURE.md # System design
    ├── specs/         # Feature specifications
    ├── guides/        # Developer guides
    ├── diagrams/      # Architecture diagrams
    ├── benchmarks/    # Performance results
    └── versions/      # Release reports
```

## Testing Requirements

All projects using rulebook must follow these testing standards:

- **Minimum Coverage**: Configurable (default 95%)
- **Test Location**: `/tests` directory in project root
- **Test Execution**: 100% of tests must pass before next task
- **Test-Driven**: Write tests before implementation

## Rules Ignore

Create a `.rulesignore` file to selectively disable rules:

```
# Ignore coverage requirement
coverage-threshold

# Ignore specific language rules
rust/edition-2024

# Ignore all TypeScript rules
typescript/*

# Use glob patterns
*-threshold
```

## Generated Workflows

When workflow generation is enabled, rulebook creates GitHub Actions workflows:

### Rust
- `rust-test.yml`: Cross-platform testing with nextest
- `rust-lint.yml`: Clippy and rustfmt checks
- `codespell.yml`: Spelling error detection

### TypeScript
- `typescript-test.yml`: Vitest with coverage reporting
- `typescript-lint.yml`: ESLint, Prettier, and type checking

### Python
- `python-test.yml`: Pytest with coverage
- `python-lint.yml`: Ruff, Black, and mypy

## Example AGENTS.md Output

```markdown
<!-- RULEBOOK:START -->
# Project Rules

## Documentation Standards
**CRITICAL**: Minimize Markdown files. Keep documentation organized.

## Testing Requirements
- **Minimum Coverage**: 95%
- **Test Location**: `/tests` directory
- **Test Execution**: 100% pass rate required

## Feature Development Workflow
1. Check specifications in `/docs/specs/`
2. Implement with tests
3. Run quality checks
4. Update documentation
<!-- RULEBOOK:END -->

<!-- RUST:START -->
# Rust Project Rules
[Rust-specific rules...]
<!-- RUST:END -->

<!-- VECTORIZER:START -->
# Vectorizer Instructions
[Vectorizer usage patterns...]
<!-- VECTORIZER:END -->
```

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Format
npm run format
```

## Requirements

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct.

## Support

- 📖 [Documentation](https://github.com/hivellm/rulebook/docs)
- 🐛 [Issue Tracker](https://github.com/hivellm/rulebook/issues)
- 💬 [Discussions](https://github.com/hivellm/rulebook/discussions)

## Credits

Created by the HiveLLM Team to standardize AI-assisted development workflows.

