# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**@hivehub/rulebook** is a CLI tool and MCP server that standardizes AI-generated projects with automated templates, quality gates, and framework detection. It supports 28 languages, 17 frameworks, 12 MCP modules, and 20 services.

**Core Purpose**: Provides LLMs with clear directives and templates to generate consistent, high-quality code across projects.

**Key Features**:
- Auto-detection of languages, frameworks, MCP modules, and services
- Modular template architecture stored in `/rulebook/` directory
- Built-in task management system (OpenSpec-compatible format)
- MCP server for programmatic task management via Model Context Protocol
- Git hooks automation for quality enforcement
- GitHub Actions workflow generation

## Commands

### Development Commands

```bash
# Build
npm run build              # Compile TypeScript to dist/

# Development
npm run dev               # Run CLI in development mode with tsx

# Testing
npm test                  # Run all tests once
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
npm run test:agent        # Test agent parsers (simple)
npm run test:agent:full   # Test all agent manager features
npm run test:agent:comprehensive  # Comprehensive agent tests

# Code Quality
npm run lint              # Run ESLint (errors only, quiet mode)
npm run lint:fix          # Auto-fix linting issues
npm run format            # Format code with Prettier
npm run type-check        # TypeScript type checking without emit

# MCP Server
npm run setup:mcp         # Setup MCP configuration
npm run mcp-server        # Start MCP server (stdio transport)
```

### Running a Single Test

```bash
# Run specific test file
npx vitest run tests/detector.test.ts

# Run tests matching pattern
npx vitest run -t "should detect TypeScript"

# Run in watch mode for specific file
npx vitest watch tests/detector.test.ts
```

### CLI Testing

```bash
# Test init command
npm run dev init -- --yes

# Test task commands
npm run dev task create test-task-id
npm run dev task list
npm run dev task show test-task-id
```

## Code Architecture

### High-Level Structure

The codebase follows a **modular CLI architecture** with clear separation of concerns:

1. **CLI Layer** (`src/index.ts`, `src/cli/commands.ts`)
   - Entry point and command registration using Commander.js
   - All commands route through `src/cli/commands.ts`
   - Prompts handled by `src/cli/prompts.ts` using Inquirer

2. **Core Business Logic** (`src/core/`)
   - **detector.ts**: Auto-detects languages, frameworks, modules, and services from project files
   - **generator.ts**: Generates AGENTS.md content using modular template system
   - **task-manager.ts**: Task lifecycle management (create, list, validate, archive)
   - **merger.ts**: Merges existing AGENTS.md with new templates while preserving customizations
   - **migrator.ts**: Migrates embedded templates to modular `/rulebook/` structure
   - **workflow-generator.ts**: Generates GitHub Actions workflows for detected languages/frameworks
   - **config-manager.ts**: Manages `.rulebook` configuration file
   - **agent-manager.ts**: Orchestrates AI CLI agents (Cursor, Claude Code, Gemini)
   - **watcher.ts**: Full-screen task monitoring UI using blessed
   - **validator.ts**: Validates project structure against rulebook standards
   - **health-scorer.ts**: Calculates project health score (0-100)
   - **auto-fixer.ts**: Auto-fixes common issues (missing files, bad configs)

3. **MCP Server** (`src/mcp/rulebook-server.ts`)
   - Model Context Protocol server using `@modelcontextprotocol/sdk`
   - Exposes 7 task management functions: create, list, show, update, validate, archive, delete
   - Uses stdio transport (no HTTP server)
   - Automatically finds `.rulebook` file by walking up directories (like git)

4. **Template System** (`templates/`)
   - Templates organized by type: `languages/`, `frameworks/`, `modules/`, `services/`, `core/`, `cli/`, `ides/`
   - Templates are markdown files read at runtime and injected into `/rulebook/` directory
   - Core templates: `RULEBOOK.md`, `QUALITY_ENFORCEMENT.md`, `DOCUMENTATION_RULES.md`, `GIT.md`

5. **Agent Parsers** (`src/agents/`)
   - Parse output from AI CLI tools: `cursor-agent.ts`, `claude-code.ts`, `gemini-cli.ts`
   - Extract task status, completion, and error information from agent output

6. **Utilities** (`src/utils/`)
   - **file-system.ts**: File operations (read, write, exists, find, backup)
   - **git-hooks.ts**: Cross-platform git hook generation (shell wrapper + Node.js script)
   - **rulesignore.ts**: Parse `.rulesignore` files for excluding paths

### Key Architectural Patterns

#### 1. **Modular Template Architecture**

Instead of embedding all rules in AGENTS.md (which causes 100k+ character files), templates are:
- Stored in `/templates/` directory at build time
- Generated into `/rulebook/specs/` directory at runtime (user's project)
- Referenced from AGENTS.md using relative paths: `/rulebook/specs/TYPESCRIPT.md`
- This allows on-demand loading and better AI performance

#### 2. **Detection System**

The detector (`src/core/detector.ts`) uses multiple indicators for accurate detection:
- **Languages**: Looks for config files (package.json, Cargo.toml, requirements.txt) and source files
- **Frameworks**: Checks dependencies in package.json, imports in source files, and file structures
- **Modules**: Detects MCP modules from `.cursor/mcp.json`, package.json dependencies
- **Services**: Detects databases/caches from package.json drivers, .env vars, docker-compose.yml

Returns confidence scores (0.0-1.0) for each detection.

#### 3. **Task Management System**

Task structure (OpenSpec-compatible):
```
rulebook/tasks/<task-id>/
├── proposal.md         # Why and what changes
├── tasks.md           # Simple checklist (- [ ] items only)
├── design.md          # Technical design (optional)
└── specs/
    └── <module>/
        └── spec.md    # Technical specs (SHALL/MUST requirements)
```

**CRITICAL RULES**:
- `tasks.md` contains ONLY simple checklist items (no long explanations)
- Technical details go in `specs/<module>/spec.md`
- Never create README.md, PROCESS.md, or other files in task directories

#### 4. **MCP Server Architecture**

The MCP server uses:
- **stdio transport**: JSON-RPC 2.0 messages over stdin/stdout (no HTTP)
- **Automatic project detection**: Walks up directories to find `.rulebook` (like git)
- **Zod schemas**: Input validation for all 7 MCP functions
- **Zero configuration**: Works out of the box after `rulebook mcp init`

Server does NOT pollute stdout with logs (only JSON-RPC messages). Debug logs go to stderr.

#### 5. **Git Hooks Cross-Platform Strategy**

Hooks are generated as TWO files:
1. **Shell wrapper** (`.git/hooks/pre-commit`): Detects Node.js in common locations (Windows/Linux)
2. **Node.js script** (`.git/hooks/pre-commit.js`): Uses `child_process.spawn` for cross-platform commands

This ensures hooks work on both Windows (Git Bash) and Linux.

#### 6. **Merger Strategy**

When updating existing AGENTS.md:
1. Parse existing file to extract custom blocks between `<!-- RULEBOOK:START -->` and `<!-- RULEBOOK:END -->`
2. Generate new content from latest templates
3. Merge custom blocks back into new content
4. Preserve user customizations while updating to latest standards

### Project Structure

```
rulebook/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript types and interfaces
│   ├── cli/                  # CLI layer
│   │   ├── commands.ts       # Command implementations
│   │   └── prompts.ts        # User prompts (Inquirer)
│   ├── core/                 # Core business logic
│   │   ├── detector.ts       # Project detection
│   │   ├── generator.ts      # Template generation
│   │   ├── task-manager.ts   # Task management
│   │   ├── merger.ts         # Template merging
│   │   ├── migrator.ts       # Migration logic
│   │   ├── workflow-generator.ts
│   │   ├── agent-manager.ts
│   │   ├── watcher.ts
│   │   └── ...
│   ├── mcp/                  # MCP server
│   │   └── rulebook-server.ts
│   ├── agents/               # AI agent parsers
│   │   ├── cursor-agent.ts
│   │   ├── claude-code.ts
│   │   └── gemini-cli.ts
│   └── utils/                # Utilities
│       ├── file-system.ts
│       ├── git-hooks.ts
│       └── rulesignore.ts
├── templates/                # Template files (shipped with package)
│   ├── core/                 # Core templates (RULEBOOK, QUALITY_ENFORCEMENT, etc.)
│   ├── languages/            # Language-specific templates (28 languages)
│   ├── frameworks/           # Framework templates (17 frameworks)
│   ├── modules/              # MCP module templates (12 modules)
│   ├── services/             # Service integration templates (20 services)
│   ├── cli/                  # CLI agent templates (15 agents)
│   └── ides/                 # IDE templates (8 IDEs)
├── tests/                    # Vitest tests
├── scripts/                  # Build and test scripts
├── docs/                     # Documentation
├── dist/                     # Compiled output (TypeScript -> JavaScript)
└── package.json
```

### Type System

Core types defined in `src/types.ts`:

- **DetectionResult**: Result from project detection (languages, frameworks, modules, services)
- **LanguageDetection**: Language with confidence score and indicators
- **FrameworkDetection**: Framework with detected status and confidence
- **ModuleDetection**: MCP module with detected status
- **ServiceDetection**: Service (database/cache) with detected status
- **ProjectConfig**: User configuration for project initialization
- **RulebookConfig**: `.rulebook` file structure (JSON)
- **RulebookTask**: Task structure for task manager

### Module Interactions

```
┌─────────────────────────────────────────────────────────────┐
│                       CLI (index.ts)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────┐
│                   Commands (cli/commands.ts)                │
└──┬──────────┬──────────┬──────────┬──────────┬─────────┬───┘
   │          │          │          │          │         │
   v          v          v          v          v         v
┌──────┐  ┌──────┐  ┌────────┐  ┌──────┐  ┌────────┐ ┌───┐
│Detect│  │ Gen  │  │ Merger │  │ Task │  │ Agent  │ │MCP│
│or.ts │  │er.ts │  │  .ts   │  │Mgr.ts│  │ Mgr.ts │ │   │
└──┬───┘  └──┬───┘  └───┬────┘  └──┬───┘  └───┬────┘ └─┬─┘
   │         │          │          │          │        │
   └─────────┴──────────┴──────────┴──────────┴────────┘
                         │
                         v
              ┌──────────────────┐
              │  File System     │
              │  (utils/)        │
              └──────────────────┘
```

### Testing Strategy

- **Unit tests**: Core logic (detector, generator, task-manager, merger, validator)
- **Integration tests**: CLI commands, MCP server, agent manager
- **Excluded from coverage**: CLI entry points, external command execution, file system operations
- **Coverage thresholds**: 75% lines, 74% functions, 65% branches (vitest.config.ts)
- **Test framework**: Vitest with v8 coverage provider

Tests use mocking for:
- File system operations (`src/utils/file-system.ts`)
- External processes (`execa`, `child_process`)
- User prompts (`inquirer`)

## Important Notes

### Quality Requirements

1. **95%+ test coverage required** for new code (except CLI and external command execution)
2. **No ESLint warnings allowed** - use `npm run lint` before committing
3. **TypeScript strict mode enabled** - all code must be type-safe
4. **Pre-commit hooks enforce**: format check, lint, type-check (tests removed for speed)
5. **Pre-push hooks enforce**: build check (first), then tests

### Critical Rules

1. **NEVER run destructive deletions (`rm -rf`) in this repository**
2. **ALL temporary files/scripts MUST be in `/scripts` directory**
3. **Remove temporary files immediately after use** (MANDATORY)
4. **ALWAYS check AGENTS.md or RULEBOOK.md first** when working with task management
5. **Follow OpenSpec-compatible task structure** (see Task Management System above)

### File Naming Conventions

- **UPPERCASE.md**: Documentation files in repository root (README.md, CHANGELOG.md, etc.)
- **lowercase-kebab-case.ts**: Source files
- **PascalCase**: TypeScript classes and interfaces
- **camelCase**: Functions and variables

### Template Development

When adding new templates:
1. Create template file in appropriate `templates/` subdirectory
2. Add detection logic in `src/core/detector.ts`
3. Add generation logic in `src/core/generator.ts`
4. Update types in `src/types.ts` if needed
5. Write tests in `tests/detector.test.ts` and `tests/generator.test.ts`

### MCP Server Development

When modifying MCP server:
1. **NEVER pollute stdout** - use stderr for logs
2. Use Zod schemas for input validation
3. Return consistent error structure: `{ success: false, error: string }`
4. Test with `npm run mcp-server` (stdio transport)
5. Update `.cursor/mcp.json` if function signatures change

### Cross-Platform Considerations

- Use `path.join()` instead of string concatenation for file paths
- Test git hooks on both Windows and Linux
- Use `execa` for cross-platform command execution (not `child_process.exec`)
- Handle Windows-style paths (backslashes) in detection logic

### Package Publishing

- **Package name**: `@hivehub/rulebook` (scoped to @hivehub org)
- **Binaries**: `rulebook` (CLI), `rulebook-mcp` (MCP server)
- **Files included**: `dist/` and `templates/` only (see package.json "files")
- **Build before publish**: `npm run build` (automatic via prepublishOnly script)
- **License**: Apache 2.0

### Known Limitations

1. **Watcher tests are skipped** due to blessed mock issues (see vitest.config.ts)
2. **Agent tests require real CLI tools** - use `npm run test:agent` for manual testing
3. **Coverage excludes external command execution** (dependency-checker, coverage-checker)
4. **MCP server requires Node.js 20+** (uses ESM and modern features)
