<!-- CLAUDE_CODE:START -->
# Claude Code CLI Documentation

**CRITICAL**: Complete documentation for Claude Code CLI tool flags and output formats.

## Claude Code Overview

Claude Code is an advanced AI coding assistant powered by Anthropic's Claude API. This tool provides command-line access to Claude's coding capabilities with extensive configuration options.

```bash
# Install
npm install -g @anthropic-ai/claude-code

# Basic usage
claude-code

# With API key
export ANTHROPIC_API_KEY=your_key_here
claude-code --model claude-3-5-sonnet
```

## CLI Flags and Options

### Core Configuration

| Flag | Type | Description | Default | Example |
|------|------|-------------|---------|---------|
| `--model` | string | Claude model to use | `claude-3-5-sonnet` | `--model claude-3-5-sonnet-20241022` |
| `--temperature` | number | Response randomness (0-1) | `0.2` | `--temperature 0.7` |
| `--max-tokens` | number | Maximum tokens in response | `8192` | `--max-tokens 4096` |
| `--api-key` | string | Anthropic API key | `$ANTHROPIC_API_KEY` | `--api-key sk-...` |

### Context Management

| Flag | Type | Description | Default | Example |
|------|------|-------------|---------|---------|
| `--files` | string | Load specific files into context | none | `--files AGENTS.md` |
| `--add-files` | string[] | Add multiple files to context | none | `--add-files "src/**/*.ts"` |
| `--context` | string | Comma-separated context files | none | `--context AGENTS.md,README.md` |
| `--project-mode` | boolean | Enable project-wide context | false | `--project-mode` |
| `--full-project` | boolean | Include entire codebase | false | `--full-project` |
| `--context-window` | string | Context window size | `medium` | `--context-window large` |

### Workflow Modes

| Flag | Type | Description | Default | Example |
|------|------|-------------|---------|---------|
| `--task` | string | Start with specific task | none | `--task "feature: Add auth"` |
| `--review` | string | Code review mode | none | `--review src/auth.ts` |
| `--refactor` | boolean | Refactoring mode | false | `--refactor` |
| `--target` | string | Target directory for refactoring | none | `--target src/legacy/` |
| `--debug` | boolean | Debug mode | false | `--debug` |
| `--error-log` | string | Error log file for debug mode | none | `--error-log errors.log` |

### Analysis and Quality

| Flag | Type | Description | Default | Example |
|------|------|-------------|---------|---------|
| `--analyze` | boolean | Analyze project structure | false | `--analyze` |
| `--architecture-review` | boolean | Get architecture insights | false | `--architecture-review` |
| `--quality-check` | boolean | Code quality assessment | false | `--quality-check` |

### Output and Formatting

| Flag | Type | Description | Default | Example |
|------|------|-------------|---------|---------|
| `--output-format` | string | Output format (text, json, stream) | `text` | `--output-format json` |
| `--stream` | boolean | Enable streaming output | false | `--stream` |
| `--quiet` | boolean | Suppress progress indicators | false | `--quiet` |
| `--verbose` | boolean | Enable verbose logging | false | `--verbose` |

### Interactive Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/help` | Show all commands | `/help` |
| `/clear` | Clear conversation | `/clear` |
| `/files` | List context files | `/files` |
| `/add <file>` | Add file to context | `/add src/utils.ts` |
| `/remove <file>` | Remove file from context | `/remove src/old.ts` |
| `/tokens` | Show token usage | `/tokens` |
| `/model` | Change model | `/model claude-3-5-sonnet` |
| `/save` | Save conversation | `/save session.json` |
| `/load` | Load conversation | `/load session.json` |ude-3-5-sonnet
```

## Output Formats

### Text Output (Default)
Standard text output with markdown formatting:

```bash
claude-code --output-format text "Explain this code"
```

**Output:**
```
Here's an explanation of the code:

## Function Overview
The `processData` function handles...

## Key Components
1. **Input validation** - Checks for...
2. **Data transformation** - Converts...
3. **Error handling** - Manages...
```

### JSON Output
Structured JSON output for programmatic processing:

```bash
claude-code --output-format json "Review this code"
```

**Output:**
```json
{
  "success": true,
  "text": "Here's my review of the code...",
  "toolCalls": [
    {
      "type": "read",
      "details": "Read from src/utils.ts",
      "result": "Read 45 lines"
    }
  ],
  "duration": 1250,
  "sessionId": "claude-session-123",
  "model": "claude-3-5-sonnet",
  "tokens": {
    "input": 150,
    "output": 300,
    "total": 450
  }
}
```

### Stream Output
Real-time streaming output with progress indicators:

```bash
claude-code --stream --output-format stream "Generate a React component"
```

**Output:**
```
🤖 Using model: claude-3-5-sonnet
📁 Working directory: /project/src
📝 Generating: 0 chars
🔧 Tool #1: Creating src/components/Button.tsx
   ✅ Created 25 lines (1.2KB)
📝 Generating: 150 chars
📝 Generating: 300 chars
🎯 Completed in 2500ms (3s total)
📊 Final stats: 1 tools, 450 chars generated
```

### Stream JSON Output
JSON stream with real-time events:

```bash
claude-code --stream --output-format stream-json "Refactor this code"
```

**Output:**
```json
{"type": "system", "subtype": "init", "model": "claude-3-5-sonnet", "session_id": "claude-session-123"}
{"type": "user", "message": {"role": "user", "content": [{"type": "text", "text": "Refactor this code"}]}, "session_id": "claude-session-123"}
{"type": "assistant", "message": {"role": "assistant", "content": [{"type": "text", "text": "I'll help you refactor this code..."}]}, "session_id": "claude-session-123"}
{"type": "tool_call", "subtype": "started", "tool_call": {"writeToolCall": {"args": {"path": "src/refactored.ts", "contents": "..."}}}, "session_id": "claude-session-123"}
{"type": "tool_call", "subtype": "completed", "tool_call": {"writeToolCall": {"result": {"success": {"linesCreated": 30, "fileSize": 1200}}}}, "session_id": "claude-session-123"}
{"type": "result", "subtype": "success", "duration_ms": 2500, "is_error": false, "result": "Refactoring completed successfully", "session_id": "claude-session-123"}
```

## Configuration File

Create `.claude-code.json` in project root for persistent configuration:

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "temperature": 0.2,
  "max_tokens": 8192,
  "api_key": "sk-ant-api03-...",
  "system_prompt": "You are an expert developer following strict standards. Always reference AGENTS.md before making changes.",
  "auto_context": [
    "AGENTS.md",
    "README.md",
    "docs/ROADMAP.md"
  ],
  "quality_checks": {
    "lint_before_commit": true,
    "run_tests": true,
    "format_code": true
  },
  "output": {
    "format": "text",
    "stream": false,
    "verbose": false
  },
  "context": {
    "window_size": "medium",
    "project_mode": false,
    "auto_add_files": ["src/**/*.ts", "tests/**/*.test.ts"]
  }
}
```

## Integration with AGENTS.md

### 1. Starting Session

Always start by referencing AGENTS.md:

```bash
# Load AGENTS.md in session
claude-code --files AGENTS.md

# Then in prompt:
"Read AGENTS.md thoroughly and follow all standards and conventions defined there. 
This is your primary source of truth for this project."
```

### 2. Project Configuration

Create `.claude-code.json` in project root:

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "temperature": 0.2,
  "max_tokens": 8192,
  "system_prompt": "You are an expert developer following strict standards. Always reference AGENTS.md before making changes.",
  "auto_context": [
    "AGENTS.md",
    "README.md",
    "docs/ROADMAP.md"
  ],
  "quality_checks": {
    "lint_before_commit": true,
    "run_tests": true,
    "format_code": true
  }
}
```

## Claude Code Best Practices

### 1. Context Management

**CRITICAL**: Claude Code has excellent context management.

```bash
# Add multiple files to context
claude-code --add-files "src/**/*.ts" --add-files "tests/**/*.test.ts"

# Use project mode
claude-code --project-mode

# Specify context window
claude-code --context-window large
```

### 2. Quality Standards

**MUST follow project quality standards:**

```bash
# Before any code changes, ask Claude Code:
"Before implementing, please:
1. Review AGENTS.md for standards
2. Check existing patterns in the codebase
3. Plan the implementation approach
4. Consider test requirements
5. Verify linting and formatting rules"
```

### 3. Testing Requirements

**CRITICAL**: Always include tests.

```
"Implement this feature with:
- Comprehensive unit tests (95%+ coverage)
- Integration tests if needed
- Follow test patterns in tests/ directory
- Include edge cases and error scenarios"
```

## Claude Code Commands

### Interactive Commands

```
/help           - Show all commands
/clear          - Clear conversation
/files          - List context files
/add <file>     - Add file to context
/remove <file>  - Remove file from context
/tokens         - Show token usage
/model          - Change model
/save           - Save conversation
/load           - Load conversation
```

### Workflow Commands

```bash
# Start feature implementation
claude-code --task "feature: Add user authentication"

# Code review mode
claude-code --review src/auth.ts

# Refactoring mode
claude-code --refactor --target src/legacy/

# Bug fixing mode
claude-code --debug --error-log errors.log
```

## Integration Patterns

### 1. Feature Development

```
Prompt Template:
"I need to implement [feature]. According to AGENTS.md:
- Language: [language]
- Testing framework: [framework]
- Coverage threshold: [threshold]%
- Linting rules: [rules]

Please:
1. Review existing code structure
2. Propose implementation approach
3. Write tests first
4. Implement feature
5. Run quality checks
6. Update documentation"
```

### 2. Code Review

```
Review Request:
"Review this code against AGENTS.md standards:
[code snippet]

Check for:
- Code style compliance
- Type safety
- Error handling
- Test coverage
- Documentation
- Performance concerns"
```

### 3. Debugging

```
Debug Request:
"Debug this issue following AGENTS.md patterns:
Error: [error message]
Context: [context]

Please:## Usage Examples

### Basic Code Generation
```bash
# Simple code generation
claude-code "Create a TypeScript utility function for data validation"

# With specific model
claude-code --model claude-3-5-sonnet-20241022 "Write a React hook for API calls"

# With context files
claude-code --files src/types.ts "Generate types based on existing interfaces"
```

### Project Analysis
```bash
# Analyze entire project
claude-code --analyze --full-project

# Architecture review
claude-code --architecture-review --context "docs/ARCHITECTURE.md"

# Quality assessment
claude-code --quality-check --verbose
```

### Code Review and Refactoring
```bash
# Review specific file
claude-code --review src/auth.ts --output-format json

# Refactor entire directory
claude-code --refactor --target src/legacy/ --stream

# Debug with error log
claude-code --debug --error-log debug.log "Fix this authentication bug"
```

### Advanced Workflows
```bash
# Feature implementation with project context
claude-code --task "feature: Add user authentication" --project-mode --stream

# Multi-file context
claude-code --add-files "src/**/*.ts" --add-files "tests/**/*.test.ts" "Generate comprehensive tests"

# Interactive session with saved state
claude-code --load session.json
# ... work in interactive mode ...
/save session.json
```

## Best Practices

### DO's ✅

- **Always** reference AGENTS.md at session start
- **Use** Claude Code's project mode for consistency
- **Request** explanations for suggested changes
- **Verify** all changes pass linting and tests
- **Ask** Claude Code to follow existing patterns
- **Use** `/add AGENTS.md` before any work
- **Request** test-first development
- **Save** important conversations with `/save`
- **Use** `--stream` for long-running tasks
- **Configure** `.claude-code.json` for project consistency
- **Use** `--verbose` for debugging issues
- **Test** with `--dry-run` before making changes

### DON'Ts ❌

- **Never** skip quality checks
- **Never** accept code without tests
- **Never** bypass linting rules
- **Never** ignore AGENTS.md standards
- **Never** commit untested code
- **Don't** use without loading project context
- **Don't** accept incomplete implementations
- **Don't** use `--full-project` on large codebases without `--context-window large`
- **Don't** ignore token limits with `--max-tokens`
- **Don't** use high `--temperature` for production codeypass linting rules
- **Never** ignore AGENTS.md standards
- **Never** commit untested code
- **Don't** use without loading project context
- **Don't** accept incomplete implementations

## Advanced Features

### 1. Long Context Usage

Claude Code supports extended context:

```bash
# Use entire codebase as context
claude-code --full-project

# Specify multiple context files
claude-code --context AGENTS.md,README.md,docs/**/*.md
```

### 2. Artifacts and Code Blocks

Claude Code can generate artifacts:

```
"Generate a complete module with:
- Type definitions
- Implementation
- Tests
- Documentation
Output as separate artifacts for easy review"
```

### 3. Project Analysis

```bash
# Analyze project structure
claude-code --analyze

# Get architecture insights
claude-code --architecture-review

# Code quality assessment
claude-code --quality-check
```

## Prompt Templates

### Feature Implementation

```
Task: Implement [feature name]

Context from AGENTS.md:
- Language: [language]
- Framework: [framework]
- Test coverage required: [threshold]%
- Code style: [style guide]

Requirements:
1. Follow TDD approach
2. Match existing code patterns
3. Include comprehensive tests
4. Add documentation
5. Pass all quality checks

Please start by analyzing existing similar features.
```

### Code Refactoring

```
Refactor [component/module] according to AGENTS.md standards.

Current issues:
- [list issues]

Expected outcome:
- Improved code structure
- Better error handling
- Enhanced performance
- Maintained functionality
```

## Error Handling and Troubleshooting

### Common Error Codes

| Code | Error | Solution |
|------|-------|----------|
| `E001` | API key not found | Set `ANTHROPIC_API_KEY` or use `--api-key` |
| `E002` | Model not available | Check model name or use default |
| `E003` | Context too large | Use `--context-window large` or reduce files |
| `E004` | File not found | Check file paths and permissions |
| `E005` | Invalid JSON output | Use `--output-format text` for debugging |
| `E006` | Rate limit exceeded | Wait and retry with `--quiet` |

### Debugging Commands

```bash
# Enable verbose logging
claude-code --verbose "Debug this issue"

# Check token usage
claude-code --tokens "Count tokens in this text"

# Test with minimal context
claude-code --files AGENTS.md "Simple test"

# Dry run mode (if supported)
claude-code --dry-run "What would you change?"
```

### Performance Optimization

```bash
# Use streaming for long responses
claude-code --stream "Generate large documentation"

# Limit context for faster responses
claude-code --context-window small "Quick question"

# Use specific model for task
claude-code --model claude-3-5-haiku "Simple refactoring"
```

## Integration with Development Workflows

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit
claude-code --quality-check --quiet || exit 1
```

### CI/CD Pipeline
```yaml
# .github/workflows/claude-review.yml
- name: Code Review with Claude
  run: |
    claude-code --review src/ --output-format json > review.json
    claude-code --quality-check --stream
```

### IDE Integration
```json
// .vscode/tasks.json
{
  "label": "Claude Code Review",
  "type": "shell",
  "command": "claude-code",
  "args": ["--review", "${file}", "--stream"],
  "group": "build"
}
```

## API Reference

### Environment Variables
- `ANTHROPIC_API_KEY`: Default API key
- `CLAUDE_CODE_MODEL`: Default model
- `CLAUDE_CODE_TEMPERATURE`: Default temperature
- `CLAUDE_CODE_MAX_TOKENS`: Default max tokens

### Exit Codes
- `0`: Success
- `1`: General error
- `2`: Configuration error
- `3`: API error
- `4`: File system error
- `5`: Validation error

### Configuration Precedence
1. Command line flags
2. `.claude-code.json` file
3. Environment variables
4. Default values
- Clean, maintainable code
- Improved test coverage
- Better type safety
- Enhanced documentation

Maintain backward compatibility and add migration notes.
```

### Bug Fix

```
Bug: [description]
Location: [file:line]
Error: [error message]

As per AGENTS.md:
1. Analyze root cause
2. Propose fix
3. Add regression tests
4. Verify no side effects
5. Update relevant documentation

Include before/after comparison.
```

## Post-Generation Workflow

**CRITICAL**: After generating code with Claude Code, you MUST execute the AGENT_AUTOMATION workflow:

```bash
# Step 1: Quality checks (type, lint, format, test, coverage)
npm run type-check
npm run lint
npm test
npm run test:coverage

# Step 1.5: Security audit
npm audit --production --audit-level=moderate
npm outdated

# Step 2: Update OpenSpec tasks if applicable
# (If working on OpenSpec change)

# Step 3: Update documentation
# Update README.md, CHANGELOG.md, etc.

# Step 4: Git commit with conventional format
git add .
git commit -m "feat: Description"

# Step 5: Report results
echo "✅ All tasks complete! Commit: $(git rev-parse HEAD)"
```

**Integration with AGENT_AUTOMATION:**
Refer to `templates/modules/AGENT_AUTOMATION.md` for complete workflow details.

## Error Recovery

**What to do when Claude Code can't run tests locally:**

```bash
# Fallback to manual execution
echo "❌ Claude Code can't run tests locally"
echo "📝 Manual execution required:"
echo "   npm test"
echo "   npm run lint"
echo "   npm run type-check"

# Integration with AGENT_AUTOMATION error recovery
# Refer to AGENT_AUTOMATION.md error recovery workflow
```

**When to abandon current approach:**
- Same error occurs 3+ times
- AGENT_AUTOMATION workflow fails repeatedly
- OpenSpec validation reveals fundamental mismatch
- Security audit blocks critical path

**Retry with alternative approach:**
- Try different implementation pattern from AGENTS.md
- Consider different architecture/design
- Review OpenSpec for alternative solutions

## Quality Checklist

Before accepting Claude Code's suggestions:

- [ ] Code follows AGENTS.md standards
- [ ] All tests pass
- [ ] Coverage meets threshold
- [ ] Linting passes
- [ ] Types are correct
- [ ] Documentation updated
- [ ] No warnings or errors
- [ ] Follows existing patterns
- [ ] Backwards compatible (if applicable)
- [ ] Performance acceptable

## Tips for Best Results

1. **Be Specific**: Reference exact sections of AGENTS.md
2. **Provide Context**: Include relevant files in context
3. **Iterative Review**: Review changes in small batches
4. **Ask Questions**: Request explanations for decisions
5. **Use Examples**: Show Claude Code existing patterns
6. **Test First**: Always request tests before implementation
7. **Documentation**: Ask for inline and external docs
8. **Code Review**: Treat Claude Code output as PR requiring review

## Troubleshooting

### Claude Code Not Following Standards

```
"Stop. Re-read AGENTS.md sections [X, Y, Z].
The code doesn't comply with [specific standard].
Please revise following these exact requirements."
```

### Inconsistent Code Style

```
"Apply the code style from AGENTS.md:
- [specific formatting rules]
- [naming conventions]
- [structure patterns]

Review existing files in [directory] for reference."
```

### Missing Tests

```
"This implementation is missing tests required by AGENTS.md.
Coverage threshold: [X]%
Please add comprehensive tests covering:
- Happy path
- Error cases
- Edge cases
- Integration scenarios"
```

<!-- CLAUDE_CODE:END -->

