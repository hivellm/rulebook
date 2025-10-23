<!-- VSCODE:START -->
# VS Code AI Extensions Rules

**CRITICAL**: Rules for using AI extensions in Visual Studio Code (GitHub Copilot, Cody, etc.)

## Supported AI Extensions

### 1. GitHub Copilot

```
Features:
- Inline code suggestions
- Chat interface (Copilot Chat)
- Code explanations
- Test generation
- Documentation assistance
```

### 2. Cody

```
Features:
- Context-aware completions
- Multi-file understanding
- Codebase search
- Refactoring suggestions
```

### 3. Other Extensions

```
Compatible with:
- Tabnine
- Amazon CodeWhisperer
- Continue
- Cursor for VS Code
```

## Integration with AGENTS.md

### 1. Workspace Configuration

Create `.vscode/settings.json`:

```json
{
  "github.copilot.advanced": {
    "authProvider": "github",
    "inlineSuggestEnable": true
  },
  "github.copilot.editor.enableAutoCompletions": true,
  "cody.customHeaders": {},
  "cody.codebase": "."
}
```

### 2. Project Instructions

Create `.vscode/copilot-instructions.md`:

```markdown
# Project Standards

This project uses @hivellm/rulebook standards.

## Critical Rules

1. Read AGENTS.md in project root for all standards
2. Minimum test coverage: 95%
3. All tests must pass before committing
4. Linter must pass with zero warnings
5. Documentation in /docs/ (except allowed root files)

## Language Standards

- Rust: Edition 2024, clippy -D warnings, cargo fmt
- TypeScript: ESLint + Prettier, strict mode
- Python: Ruff + Black, mypy type checking

## Testing Patterns

See AGENTS.md for:
- Test location: /tests directory
- Coverage requirements
- Test framework specifics
```

## Code Generation Patterns

### 1. Inline Suggestions

```
Accept inline suggestions that:
✅ Follow coding style from AGENTS.md
✅ Include proper error handling
✅ Have descriptive variable names
✅ Match project patterns

Reject suggestions that:
❌ Use deprecated patterns
❌ Ignore error handling
❌ Have poor naming
❌ Violate type safety
```

### 2. Copilot Chat

Use chat for:

```
Good:
"Generate tests for this function following AGENTS.md coverage requirements"
"Refactor this to follow our error handling patterns from AGENTS.md"
"Add documentation following our standards"

Avoid:
"Write code"
"Fix this"
"Make it better"
```

### 3. Test Generation

```
Pattern:
1. Select function/module
2. Open Copilot Chat: "Generate comprehensive tests for this following AGENTS.md standards. Include edge cases, error handling, and achieve 95%+ coverage."
3. Review generated tests
4. Run tests to verify
5. Add missing test cases
```

## Workflow Integration

### 1. Development Cycle

```
1. Write function signature
2. Accept Copilot suggestion for implementation
3. Verify against AGENTS.md standards
4. Open Chat: "Generate tests for this"
5. Run linter and tests
6. Fix any issues with Chat help
7. Commit when all checks pass
```

### 2. Refactoring

```
1. Select code to refactor
2. Copilot Chat: "Refactor this following AGENTS.md patterns for [specific pattern]"
3. Review suggestions
4. Apply changes
5. Update tests
6. Verify all tests pass
```

### 3. Debugging

```
1. Copy error message
2. Copilot Chat: "Debug this error following AGENTS.md error handling: [error]"
3. Review explanation
4. Apply fix
5. Add test for error case
```

## VS Code Settings

### Recommended Extensions

Install these extensions:

```
Essential:
- GitHub Copilot / Cody
- ESLint (TypeScript/JavaScript)
- Prettier
- rust-analyzer (Rust)
- Python
- Error Lens
- Better Comments

Optional:
- GitLens
- Todo Tree
- Coverage Gutters
- Test Explorer
```

### Settings.json Configuration

```json
{
  // Editor
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "editor.rulers": [100],
  
  // Language-specific
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer",
    "editor.formatOnSave": true
  },
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff"
  },
  
  // Testing
  "testing.automaticallyOpenPeekView": "failureInVisibleDocument",
  
  // Copilot
  "github.copilot.enable": {
    "*": true
  },
  "github.copilot.editor.enableAutoCompletions": true
}
```

### Tasks Configuration

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Quality Check - TypeScript",
      "type": "shell",
      "command": "npm run type-check && npm run lint && npm test",
      "group": {
        "kind": "test",
        "isDefault": true
      }
    },
    {
      "label": "Quality Check - Rust",
      "type": "shell",
      "command": "cargo clippy -- -D warnings && cargo test",
      "group": "test"
    },
    {
      "label": "Quality Check - Python",
      "type": "shell",
      "command": "ruff check . && mypy . && pytest",
      "group": "test"
    }
  ]
}
```

## Chat Patterns

### Pattern 1: Feature Implementation

```
Chat Command:
"Following AGENTS.md standards, implement user authentication:
1. Create types/interfaces
2. Implement core logic with error handling
3. Generate comprehensive tests (95%+ coverage)
4. Add inline documentation"

Review:
- Check standards compliance
- Verify error handling
- Test coverage
- Documentation quality
```

### Pattern 2: Code Review

```
Chat Command:
"Review this code against AGENTS.md standards. Check for:
- Error handling patterns
- Test coverage
- Documentation
- Code style
- Performance issues"

Apply:
- Suggested improvements
- Additional tests
- Documentation fixes
```

### Pattern 3: Test Generation

```
Chat Command:
"Generate comprehensive test suite for this module following AGENTS.md:
- Unit tests for all functions
- Edge cases and error conditions
- Integration tests if needed
- Achieve 95%+ coverage"

Verify:
- All cases covered
- Run tests to confirm
- Check coverage report
```

## Quality Assurance

### Pre-Commit Checklist

Use VS Code tasks:

1. Run "Quality Check" task (Cmd/Ctrl+Shift+B)
2. Verify all tests pass
3. Check coverage report
4. Review linter output
5. Commit only if all pass

### Code Review

Use Copilot for:

```
- "Explain this code"
- "Find potential bugs in this"
- "Suggest performance improvements"
- "Review error handling"
```

## Keyboard Shortcuts

Essential shortcuts:

```
- Alt+\ : Trigger Copilot inline suggestion
- Ctrl+Enter : Open Copilot suggestions panel
- Ctrl+Shift+I : Open Copilot Chat
- Cmd/Ctrl+Shift+P : Command Palette
- Cmd/Ctrl+Shift+B : Run build/test task
```

## Troubleshooting

### Copilot Not Following Standards

```
Solution 1: Add .vscode/copilot-instructions.md with AGENTS.md reference
Solution 2: Be explicit in chat: "Following AGENTS.md standards..."
Solution 3: Review and reject suggestions that don't comply
```

### Poor Suggestions

```
Solution 1: Improve context with better comments
Solution 2: Use Chat instead of inline for complex tasks
Solution 3: Provide examples of desired patterns
```

### Missing Context

```
Solution 1: Open related files in editor
Solution 2: Reference AGENTS.md explicitly in chat
Solution 3: Use workspace symbol search (Cmd/Ctrl+T)
```

## Advanced Usage

### 1. Snippet Generation

Create `.vscode/snippets.code-snippets`:

```json
{
  "Test Template": {
    "prefix": "test-template",
    "body": [
      "describe('${1:module}', () => {",
      "  it('should ${2:behavior}', () => {",
      "    // Arrange",
      "    ${3:}",
      "    ",
      "    // Act",
      "    ",
      "    // Assert",
      "    expect(${4:result}).toBe(${5:expected});",
      "  });",
      "});"
    ],
    "description": "Test template following AGENTS.md"
  }
}
```

### 2. Multi-File Operations

```
Chat:
"Refactor authentication across these files following AGENTS.md:
- @/src/auth.rs
- @/src/middleware/auth.rs
- @/tests/auth.test.rs"
```

### 3. Documentation Generation

```
Chat:
"Generate comprehensive documentation for this API following AGENTS.md:
- Function signatures
- Parameter descriptions
- Return values
- Error conditions
- Usage examples"
```

## Best Practices

1. **Always Reference AGENTS.md**: Start requests with standards reference
2. **Review Suggestions**: Never blindly accept AI suggestions
3. **Run Quality Checks**: Use tasks to verify standards compliance
4. **Iterate**: If result doesn't match standards, ask AI to fix
5. **Learn Patterns**: Train AI with good examples from codebase
6. **Stay Consistent**: Use same prompting patterns for predictability
7. **Verify Tests**: Always run tests after AI-generated changes

<!-- VSCODE:END -->

