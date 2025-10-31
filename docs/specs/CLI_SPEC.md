# CLI Specification

## Overview

The Rulebook CLI is an interactive tool for generating and managing project standardization rules for AI-assisted development.

## Commands

### init

Initialize rulebook for the current project.

```bash
rulebook init [options]
```

**Options:**
- `--yes, -y`: Skip prompts and use detected defaults
- `--minimal`: Use minimal mode (essentials only)

**Behavior:**
1. Detect project language(s), frameworks, and MCP modules
2. Detect Git hooks (pre-commit, pre-push)
3. Detect existing AGENTS.md
4. Prompt for configuration (unless --yes)
   - Setup mode (minimal or full)
   - Languages (28 supported)
   - Frameworks (17 supported, filtered by language)
   - MCP modules (12 available)
   - IDE preferences (8 options)
   - Git hook installation (if missing)
   - Coverage threshold
   - Documentation strictness
5. Generate or merge AGENTS.md
6. Optionally install Git hooks from templates
7. Generate GitHub Actions workflows
8. Scaffold project structure (README, LICENSE, /docs, /tests)
9. Display next steps

**Exit Codes:**
- `0`: Success
- `1`: Error during execution

### update

Update existing project to latest rulebook templates.

```bash
rulebook update [options]
```

**Options:**
- `--yes, -y`: Skip prompts and use defaults

**Behavior:**
1. Create backup of current AGENTS.md
2. Detect project changes
3. Merge latest templates
4. Update .rulebook configuration
5. Preserve customizations

### validate

Validate project structure against rulebook standards.

```bash
rulebook validate
```

**Checks:**
- AGENTS.md presence and quality
- Documentation structure
- Tests directory
- .rulesignore patterns
- Quality scoring (0-100)

### health

Analyze project health across 6 categories.

```bash
rulebook health
```

**Categories:**
- Documentation
- Testing  
- Quality
- Security
- CI/CD
- Dependencies

### fix

Auto-fix common project issues.

```bash
rulebook fix
```

**Fixes:**
- Creates missing .gitignore
- Creates missing LICENSE
- Creates missing README.md
- Creates /docs directory
- Runs code formatting
- Fixes lint errors automatically

### generate-docs

Generate documentation structure.

```bash
rulebook generate-docs
```

**Creates:**
- CONTRIBUTING.md
- CODE_OF_CONDUCT.md
- SECURITY.md
- docs/ROADMAP.md
- docs/ARCHITECTURE.md
- docs/DAG.md

### version

Bump version across all language files.

```bash
rulebook version <major|minor|patch>
```

**Updates:**
- package.json
- Cargo.toml
- pyproject.toml
- And more language-specific files

### changelog

Generate CHANGELOG.md from git commits.

```bash
rulebook changelog
```

**Parses:**
- Conventional commits
- Categorizes: Added, Changed, Fixed, Breaking

## Interactive Prompts

### Language Detection

If language detected:
```
Detected rust project (confidence: 100%). Is this correct? (Y/n)
```

If no language detected:
```
Select the languages used in this project:
❯ ◯ Rust
  ◯ TypeScript
  ◯ Python
  ◯ Go
  ◯ Java
```

### Project Type

```
What type of project is this?
  Application
  Library
  CLI Tool
  Monorepo
```

### Setup Mode

```
Setup mode:
  Minimal – essentials only (README, LICENSE, tests, basic CI)
  Full – complete setup with all Rulebook features
```

### Framework Selection

```
Select frameworks to include instructions for:
❯ ◉ NestJS (TYPESCRIPT) – detected
  ◯ Django (PYTHON)
  ◯ Next.js (TYPESCRIPT)
  ◯ React Native (TYPESCRIPT)
  ◯ Flutter (DART)
```

### Module Selection

```
Select MCP modules to include rules for:
❯ ◉ Vectorizer (semantic search)
  ◯ Synap (key-value store)
  ◯ OpenSpec (proposal system)
  ◯ Context7 (library docs)
  ◯ GitHub MCP Server (workflow validation & CI/CD monitoring)
  ◯ Playwright (browser automation & testing)
  ◯ Supabase (database, auth, storage)
  ◯ Notion (documentation & task management)
  ◯ Atlassian (Jira, Confluence, Bitbucket)
  ◯ Serena (AI development assistant)
  ◯ Figma (design system integration)
  ◯ Grafana (metrics & dashboards)
```

### Git Hooks Installation

```
Install Git hooks for automated quality checks? (pre-commit) (pre-push) (Y/n)
```

### IDE Selection

```
Select IDEs/tools to generate rules for:
❯ ◉ Cursor
  ◯ Windsurf
  ◯ VS Code
  ◯ GitHub Copilot
```

### Coverage Threshold

```
Minimum test coverage percentage: (95)
```

### Documentation Strictness

```
Enforce strict documentation structure (/docs only)? (Y/n)
```

### Workflow Generation

```
Generate GitHub Actions workflows? (Y/n)
```

### Merge Strategy

When AGENTS.md exists:
```
AGENTS.md already exists. How would you like to proceed?
  Merge - Add/update RULEBOOK block only (preserves existing content)
  Replace - Completely replace with new AGENTS.md (backup will be created)
```

## Output Format

### Success

```
🔍 Rulebook Project Initializer

✓ Project detection complete

✓ Detected languages:
  - rust (100% confidence)
    Indicators: Cargo.toml, 15 .rs files

✓ Detected modules:
  - vectorizer (mcp.json)

⚠ Found existing AGENTS.md with 3 blocks
  - OPENSPEC
  - PROJECT
  - VECTORIZER

✅ AGENTS.md written to /path/to/AGENTS.md

✨ Rulebook initialization complete!

Next steps:
  1. Review AGENTS.md
  2. Create .rulesignore if needed
  3. Set up /docs structure
  4. Run your AI assistant with the new rules
```

### Error

```
❌ Error: Unable to detect project type
Please ensure you're in a valid project directory.
```

## File Operations

### Reading Files
- Detect project files (Cargo.toml, package.json, etc.)
- Read MCP configuration (mcp.json, mcp-config.json)
- Read existing AGENTS.md
- Parse .rulesignore

### Writing Files
- Create or update AGENTS.md
- Create backup of existing AGENTS.md
- Generate workflow files (future)

### File Paths

All paths are relative to current working directory (`process.cwd()`).

## Error Handling

### Common Errors

1. **Not in project directory**
   - Message: "Please run this command in a project directory"
   - Exit code: 1

2. **Permission denied**
   - Message: "Permission denied writing to AGENTS.md"
   - Exit code: 1

3. **Invalid configuration**
   - Message: "Invalid project configuration"
   - Exit code: 1

### Error Recovery

- Always create backup before modifying AGENTS.md
- Provide clear error messages
- Suggest corrective actions
- Clean up on failure

## Performance

### Targets

- Detection: < 1 second
- Generation: < 1 second
- Total execution: < 5 seconds (with prompts)

### Optimization

- Use async/await for file operations
- Batch file reads when possible
- Cache detection results
- Lazy-load templates

## Testing

### Test Coverage

- Minimum 95% code coverage
- 100% test pass rate
- All edge cases covered

### Test Categories

1. **Unit Tests**: Individual functions
2. **Integration Tests**: CLI commands end-to-end
3. **Snapshot Tests**: Generated AGENTS.md content
4. **Error Tests**: Error handling and recovery

## Security

### Considerations

- No arbitrary code execution
- Safe file path handling
- No network requests (except npm registry)
- Input validation

### File Safety

- Never delete files without backup
- Validate file paths (no path traversal)
- Check permissions before writing
- Handle symlinks safely

