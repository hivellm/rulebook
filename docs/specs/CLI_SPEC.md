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

**Behavior:**
1. Detect project language(s) and structure
2. Detect MCP modules from configuration files
3. Detect existing AGENTS.md
4. Prompt for configuration (unless --yes)
5. Generate or merge AGENTS.md
6. Optionally generate workflows
7. Display next steps

**Exit Codes:**
- `0`: Success
- `1`: Error during execution

### validate

Validate project structure against rulebook standards.

```bash
rulebook validate
```

**Status:** Coming in v0.2.0

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

### Module Selection

```
Select MCP modules to include rules for:
❯ ◉ Vectorizer (semantic search)
  ◯ Synap (key-value store)
  ◯ OpenSpec (proposal system)
  ◯ Context7 (library docs)
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

