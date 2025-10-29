# @hivellm/rulebook

CLI tool to standardize AI-generated projects with templates, rules enforcement, workflow generation, CI/CD monitoring, and complete publication support for 28 programming languages.

## Features

- 🔍 **Auto-Detection**: Automatically detects project language (28 languages) and MCP modules
- 📝 **Template System**: 86+ pre-built templates for languages, modules, IDEs, workflows, and Git
- 🔄 **Smart Merging**: Intelligently merges with existing AGENTS.md files without losing content
- 🎯 **Customizable**: Configure coverage thresholds, documentation strictness, Git workflow, and more
- 🚫 **Rules Ignore**: Selectively disable rules using `.rulesignore` file
- 🤖 **AI-Optimized**: Works with 23 AI coding assistants and 8 IDEs
- 📦 **Publication Ready**: Complete CI/CD pipelines for all package registries
- 🔄 **CI/CD Monitoring**: GitHub MCP integration for automated workflow validation
- 🎨 **Git Workflow**: Quality gates, conventional commits, version management, and critical safety restrictions
- 🔒 **Safety First**: Human authorization required for destructive git operations (checkout, reset, merge conflicts)

### 🆕 Advanced Features

- 📋 **OpenSpec Integration**: Task management system with dependency tracking
- 👁️ **Real-time Watcher [BETA]**: Live monitoring of task progress with beautiful ANSI UI
- 🤖 **Autonomous Agent [BETA]**: Automated workflow management for AI CLI tools
- ⚙️ **Configuration Management**: `.rulebook` config file with feature toggles
- 📊 **Persistent Logging**: Comprehensive logging system with rotation
- 🌳 **Dependency Graphs**: Visual task dependency trees and validation
- 🔗 **CLI Bridge**: Seamless integration with cursor-agent
- 📈 **Telemetry**: Performance metrics and execution analytics
- 🔄 **Agent Automation**: CRITICAL mandatory workflow that forces AI agents to execute quality checks, update OpenSpec, and maintain documentation after EVERY implementation
- 🔒 **Critical Git Safety (v0.13.0)**: Human authorization required for destructive operations
  - `git checkout` requires explicit user confirmation
  - `git reset` requires explicit user confirmation with consequence warning
  - Merge conflicts must be resolved manually by human
  - Reduced commit frequency for cleaner git history
  - Mandatory branch strategy consultation before starting tasks

## Installation

```bash
# NPX (recommended - no installation needed)
npx @hivellm/rulebook@latest init

# Or install globally
npm install -g @hivellm/rulebook@latest
rulebook init

# Or install locally
npm install --save-dev @hivellm/rulebook@latest
npx rulebook init
```

## Quick Start

### New Project

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

### Existing Project (Update)

If you already have rulebook installed and want to update to the latest version:

```bash
npx @hivellm/rulebook@latest update
```

The update command will:
1. Detect your current project configuration
2. Create backups of AGENTS.md and .rulebook
3. Merge latest language templates with your existing rules
4. Update .rulebook to v0.11.1
5. Preserve your custom rules and configurations

## Usage

### Interactive Mode

```bash
npx @hivellm/rulebook@latest init
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
npx @hivellm/rulebook@latest init --yes
```

### Update Command

Update existing projects to the latest rulebook version:

```bash
# Interactive update (prompts for confirmation)
npx @hivellm/rulebook@latest update

# Auto mode (no prompts)
npx @hivellm/rulebook@latest update --yes
```

**What gets updated:**
- ✅ AGENTS.md language templates (preserves custom rules)
- ✅ AGENTS.md module templates (adds new MCP modules)
- ✅ .rulebook configuration file (updates to v0.13.0)
- ✅ Pre-commit command standardization
- ✅ OpenSpec workflow enhancements
- ✅ Git workflow rules with critical safety restrictions

**What is preserved:**
- ✅ Your custom rules and configurations
- ✅ IDE-specific customizations
- ✅ Project-specific settings
- ✅ Existing .rulesignore patterns

**Safety features:**
- Automatic backups before updating
- Intelligent merging (doesn't overwrite custom content)
- Can be reverted if needed

### Validation

Validate your project structure against rulebook standards:

```bash
npx @hivellm/rulebook@latest validate
```

**Checks**:
- AGENTS.md presence and quality
- Documentation structure (/docs directory)
- Tests directory existence
- .rulesignore patterns
- Project quality score (0-100)

### Dependency Checking

Check for outdated and vulnerable dependencies:

```bash
npx @hivellm/rulebook@latest check-deps
```

**Supports**:
- npm (package.json)
- Cargo (Cargo.toml)
- Python (requirements.txt, pyproject.toml)
- Go (go.mod)
- Maven/Gradle (pom.xml, build.gradle)

### Coverage Verification

Verify test coverage meets threshold:

```bash
npx @hivellm/rulebook@latest check-coverage

# Custom threshold
npx @hivellm/rulebook@latest check-coverage --threshold 90
```

**Supports**: All languages (Rust, TypeScript, Python, Go, Java, etc.)

### Version Management

Bump project version automatically:

```bash
# Bump patch version (1.0.0 → 1.0.1)
npx @hivellm/rulebook@latest version patch

# Bump minor version (1.0.0 → 1.1.0)
npx @hivellm/rulebook@latest version minor

# Bump major version (1.0.0 → 2.0.0)
npx @hivellm/rulebook@latest version major
```

**Updates**: package.json, Cargo.toml, pyproject.toml, mix.exs, build.gradle.kts, .csproj

### Changelog Generation

Generate CHANGELOG.md from git commits:

```bash
# Auto-detect version
npx @hivellm/rulebook@latest changelog

# Specify version
npx @hivellm/rulebook@latest changelog --version 1.2.0
```

**Features**:
- Parses conventional commits
- Categorizes changes (Added, Changed, Fixed, Breaking)
- Updates CHANGELOG.md with proper formatting
- Detects breaking changes automatically

### Project Health Check

Analyze project health across multiple dimensions:

```bash
npx @hivellm/rulebook@latest health
```

**Analyzes**:
- 📝 Documentation (README, CHANGELOG, LICENSE, docs/)
- 🧪 Testing (tests/, coverage, test frameworks)
- 🎨 Code Quality (linters, formatters, type checking)
- 🔒 Security (SECURITY.md, .gitignore, secrets detection)
- 🔄 CI/CD (GitHub Actions workflows)
- 📦 Dependencies (lock files, vulnerabilities)

**Output**: Overall score (0-100) with grade (A+ to F) and category breakdowns

### Custom Templates

Add your own templates to extend rulebook:

```bash
# Initialize custom templates directory
mkdir -p .rulebook/templates/{language,module,workflow,ide,cli}

# Add your custom template
echo "<!-- CUSTOM:START -->" > .rulebook/templates/language/CUSTOM.md
# ... add your template content ...
echo "<!-- CUSTOM:END -->" >> .rulebook/templates/language/CUSTOM.md

# Custom templates are automatically detected
npx @hivellm/rulebook@latest init
```

**Supports**: Custom templates for all categories

### Auto-Fix Common Issues

Automatically fix common project issues:

```bash
npx @hivellm/rulebook@latest fix
```

**Fixes**:
- Creates missing .gitignore with comprehensive patterns
- Creates missing LICENSE (MIT template)
- Creates missing README.md with template
- Creates /docs directory for documentation
- Runs code formatting (npm run format)
- Fixes lint errors automatically (npm run lint --fix)

**Integrates with health command**: Improves project health score automatically

### 🆕 Advanced Commands (v0.10.0)

#### Real-time Watcher [BETA]

Monitor task progress with simplified progress-focused interface:

```bash
# Start modern watcher (simplified UI) [BETA]
rulebook watcher

# Features:
# - Clean progress-focused layout (25% tasks, 10% progress, 65% logs)
# - Real-time progress bar with color coding
# - Active tasks display with loading indicators
# - Live activity logs with timestamps
# - Automatic task removal on completion
# - Performance optimized (throttled rendering)
# - Memory usage monitoring
# - Ctrl+C/F10 to exit
```

**New Simplified UI Layout:**
```
┌─────────────────────────────────────────────────────┐
│ 🤖 RULEBOOK WATCHER                          [F10] │
├─────────────────────────────────────────────────────┤
│ 📊 PROGRESS                                        │
│ ████████████████████░░░░░░░░░░░░░░░░░░░░ 65% - 13/20 │
├─────────────────────────────────────────────────────┤
│ 📋 ACTIVE TASKS                                    │
│ ▶ abc12345 - Implement cursor-agent parser         │
│ ○ def67890 - Write integration tests               │
├─────────────────────────────────────────────────────┤
│ 📝 ACTIVITY LOGS                                   │
│ [14:32:15] ✓ Task completed: Add parser tests      │
│ [14:32:18] i Starting task: Implement parser       │
│ [14:32:20] › Reading src/parser.ts                 │
└─────────────────────────────────────────────────────┘
```

#### Autonomous Agent [BETA]

Automated workflow management for AI CLI tools:

```bash
# Start agent with cursor-agent (recommended) [BETA]
rulebook agent --tool cursor-agent --iterations 5

# Dry-run mode (simulate without changes)
rulebook agent --dry-run

# With watcher integration
rulebook agent --watch
```

**✨ cursor-agent Integration (Fully Implemented)**

The `cursor-agent` CLI provides the most advanced integration with:

- **Real-time Progress**: Live streaming of AI responses and tool calls
- **JSON Stream Parsing**: Processes events as they arrive (system, user, assistant, tool_call, result)
- **Automatic Completion**: Detects when tasks finish and continues workflow
- **Tool Call Tracking**: Shows all file reads, writes, and bash commands in real-time
- **Auto-approval Flags**: Uses `--force` and `--approve-mcps` for non-interactive execution
- **Long Timeout**: 30-minute default for complex tasks
- **Detailed Logging**: Full visibility into what the AI is doing

**Installation:**
```bash
# Install cursor-agent globally
npm install -g cursor-agent

# Authenticate (required)
cursor-agent login

# Test installation
cursor-agent --version
```

**Example Output:**
```
🔗 Connecting to cursor-agent...
✅ Received first response from cursor-agent!

🤖 Using model: Auto
📁 Working directory: /project

📝 Generating: 189 chars
📖 Tool #1: Reading src/index.ts
   ✅ Read 150 lines
🔧 Tool #2: Creating tests/index.test.ts
   ✅ Created 45 lines (1024 bytes)

🎯 Completed in 5432ms (6s total)
📊 Final stats: 2 tools, 189 chars generated
```

**Note**: `claude-code` and `gemini-cli` integrations are implemented but temporarily disabled in v0.10.0. They will be re-enabled in a future release.

#### Configuration Management

Manage `.rulebook` configuration:

```bash
# Show current configuration
rulebook config --show

# Set configuration values
rulebook config --set coverageThreshold=90
rulebook config --set maxParallelTasks=3

# Enable/disable features
rulebook config --feature watcher --enable
rulebook config --feature notifications --disable
```

#### OpenSpec Task Management

Manage tasks and dependencies:

```bash
# List all tasks
rulebook tasks

# Show dependency tree
rulebook tasks --tree

# Show current task
rulebook tasks --current

# Update task status
rulebook tasks --status task-123
```

### Documentation Structure Generation

Generate complete documentation structure and standard open source files:

```bash
npx @hivellm/rulebook@latest generate-docs

# Auto mode
npx @hivellm/rulebook@latest generate-docs --yes
```

**Generates**:
- `/docs` directory structure (specs, guides, diagrams, benchmarks, etc.)
- `CONTRIBUTING.md` - Contribution guidelines
- `CODE_OF_CONDUCT.md` - Code of conduct
- `SECURITY.md` - Security policy
- `docs/ROADMAP.md` - Project roadmap
- `docs/ARCHITECTURE.md` - System architecture
- `docs/DAG.md` - Component dependencies

## Supported Languages (28)

### Systems & Compiled (13)
- ✅ **Rust**: Edition 2024, Clippy, Cargo fmt, nextest, llvm-cov → crates.io
- ✅ **C**: C11/C17, CMake, clang-format, sanitizers, Valgrind
- ✅ **C++**: C++20/23, CMake, clang-format, clang-tidy, Google Test → Conan/vcpkg
- ✅ **C#**: .NET 8+, nullable types, Roslyn analyzers → NuGet
- ✅ **Go**: gofmt, golangci-lint, go vet, table-driven tests → pkg.go.dev
- ✅ **Zig**: Zig 0.13+, zig fmt, cross-compilation, built-in testing
- ✅ **Swift**: Swift 5.10+, SwiftLint, strict concurrency → SPM
- ✅ **Objective-C**: Modern Obj-C, ARC, XCTest, clang analyzer
- ✅ **Ada**: Ada 2012/2022, GNAT, GPRbuild, AUnit, SPARK
- ✅ **Haskell**: GHC 9.4+, Stack/Cabal, HLint, Ormolu, Hspec, QuickCheck
- ✅ **Scala**: Scala 3.3+, sbt, scalafmt, scalafix, ScalaTest/MUnit → Maven Central
- ✅ **Dart**: Dart 3.0+, Flutter, dart analyze, package:test → pub.dev
- ✅ **Erlang**: Erlang/OTP 27+, rebar3, Dialyzer, EUnit, PropEr → Hex.pm

### Scripting & Dynamic (8)
- ✅ **TypeScript**: ESLint, Prettier, Vitest, strict mode → npm
- ✅ **JavaScript**: ES2022+, ESLint, Prettier, Vitest, ESM modules → npm
- ✅ **Python**: Ruff, Black, mypy, pytest → PyPI
- ✅ **Ruby**: Ruby 3.2+, RuboCop, RSpec/Minitest, Bundler → RubyGems
- ✅ **PHP**: PHP 8.2+, PHPStan, PHP-CS-Fixer, PHPUnit → Packagist
- ✅ **Lua**: Lua 5.4/LuaJIT, luacheck, StyLua, busted
- ✅ **Elixir**: Mix, Credo, Dialyzer, ExUnit → Hex.pm
- ✅ **Lisp**: Common Lisp, SBCL, ASDF3, FiveAM, sblint

### JVM & Enterprise (2)
- ✅ **Java**: Maven/Gradle, JUnit 5, Checkstyle, PMD, SpotBugs → Maven Central
- ✅ **Kotlin**: Kotlin 2.0+, K2 compiler, Detekt, ktlint → Maven Central

### Scientific & Data (3)
- ✅ **R**: R 4.2+, tidyverse, lintr, testthat, CRAN checks
- ✅ **Julia**: Julia 1.9+, JuliaFormatter, Test.jl, Documenter.jl
- ✅ **SQL**: SQLFluff, pgTAP, migrations, Flyway/Liquibase

### Blockchain & Specialized (2)
- ✅ **Solidity**: Solidity 0.8.26+, Hardhat/Foundry, Slither, security audits
- ✅ **SAS**: SAS 9.4+, code validation, SASUnit

## Supported MCP Modules (6)

- ✅ **Vectorizer**: Semantic search and codebase exploration
- ✅ **Synap**: Key-value store for task and data persistence
- ✅ **OpenSpec**: Change proposal and specification workflow
- ✅ **Context7**: Library documentation for dependency management
- ✅ **GitHub MCP**: Automated workflow validation and CI/CD monitoring
- ✅ **Playwright**: Automated browser testing and web automation

## Supported IDEs & AI Tools (23 total)

### IDEs (8)
- ✅ **Cursor**: Cursor-specific rules format (Agent mode, Composer)
- ✅ **Windsurf**: Windsurf configuration (Cascade AI, Flow State)
- ✅ **VS Code**: VS Code AI extensions (Copilot, Cody, Continue)
- ✅ **GitHub Copilot**: Copilot instructions and best practices
- ✅ **Tabnine**: Multi-IDE AI completion (VS Code, JetBrains, Vim, Sublime)
- ✅ **Replit**: Cloud IDE with Ghostwriter AI
- ✅ **JetBrains AI**: AI Assistant (IntelliJ, PyCharm, WebStorm, GoLand, RustRover, Rider, CLion, PhpStorm)
- ✅ **Zed**: High-performance collaborative editor (Rust-powered)

### CLI & API Agents (15)
- ✅ **Aider**: AI pair programming in terminal
- ✅ **Continue**: Open-source Copilot alternative
- ✅ **Claude**: Anthropic Claude API/CLI (200K context)
- ✅ **Claude Code**: Advanced Anthropic coding assistant
- ✅ **Gemini**: Google Gemini API/CLI (2M context)
- ✅ **Cursor CLI**: Cursor automation and scripting
- ✅ **Codeium**: Free AI coding assistant
- ✅ **Cline**: VS Code extension and CLI with quality gates
- ✅ **Amazon Q Developer**: AWS-focused with security scanning
- ✅ **Auggie** (Augment CLI): TDD mode and intelligent refactoring
- ✅ **CodeBuddy Code**: Intelligent pair programming
- ✅ **Factory Droid**: Code generation and automation
- ✅ **OpenCode**: Open-source AI assistant
- ✅ **Kilo Code**: Lightweight coding companion
- ✅ **Codex**: OpenAI code generation integration

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

## Generated Workflows (35 total)

When workflow generation is enabled, rulebook creates GitHub Actions workflows:

### Test & Lint Workflows (21)
- **Rust**: rust-test.yml, rust-lint.yml
- **TypeScript**: typescript-test.yml, typescript-lint.yml
- **Python**: python-test.yml, python-lint.yml
- **Go**: go-test.yml, go-lint.yml
- **Java**: java-test.yml, java-lint.yml
- **Elixir**: elixir-test.yml, elixir-lint.yml
- **C#**: dotnet-test.yml, dotnet-lint.yml
- **PHP**: php-test.yml, php-lint.yml
- **Swift**: swift-test.yml, swift-lint.yml
- **Kotlin**: kotlin-test.yml, kotlin-lint.yml
- **Universal**: codespell.yml (typo detection)

### Publishing Workflows (10)
- **TypeScript**: typescript-publish.yml → npm (with provenance)
- **Rust**: rust-publish.yml → crates.io
- **Python**: python-publish.yml → PyPI (trusted publishing)
- **Go**: go-publish.yml → pkg.go.dev
- **Java**: java-publish.yml → Maven Central + GitHub Packages
- **Elixir**: elixir-publish.yml → Hex.pm
- **C#**: dotnet-publish.yml → NuGet
- **PHP**: php-publish.yml → Packagist (auto-sync validation)
- **Swift**: swift-publish.yml → Swift Package Manager
- **Kotlin**: kotlin-publish.yml → Maven Central

### Git Workflow (1)
- Complete Git workflow guidelines with quality gates and CI/CD monitoring
- Critical safety restrictions requiring human authorization for destructive operations
- Merge conflict resolution protocols
- Commit frequency management
- Branch strategy consultation workflow

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

