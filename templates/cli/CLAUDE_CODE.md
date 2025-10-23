<!-- CLAUDE_CODE:START -->
# Claude Code Rules

**CRITICAL**: Specific rules and patterns for Claude Code AI coding assistant.

## Claude Code Overview

Claude Code is an advanced AI coding assistant powered by Anthropic's Claude:

```bash
# Install
npm install -g @anthropic-ai/claude-code

# Run
claude-code

# With API key
export ANTHROPIC_API_KEY=your_key_here
claude-code --model claude-3-5-sonnet
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

Please:
1. Analyze root cause
2. Propose fix aligned with project standards
3. Add tests to prevent regression
4. Verify fix doesn't break existing functionality"
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

### DON'Ts ❌

- **Never** skip quality checks
- **Never** accept code without tests
- **Never** bypass linting rules
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

