<!-- COPILOT:START -->
# GitHub Copilot Instructions

**CRITICAL**: Specific rules and patterns for GitHub Copilot (standalone or in any IDE).

## Copilot Features

### 1. Inline Suggestions

Real-time code completions:

```
Best Use Cases:
- Completing function implementations
- Writing boilerplate code
- Generating test cases
- Adding documentation
- Common patterns and idioms
```

### 2. Copilot Chat

Conversational AI assistance:

```
Use For:
- Explaining code
- Generating complex logic
- Debugging errors
- Refactoring guidance
- Architecture questions
```

### 3. Copilot for CLI

Command-line assistance:

```
Features:
- Command suggestions
- Script generation
- Shell automation
- Git operations
```

## Integration with AGENTS.md

### 1. Project Context

Copilot reads project context from:

```
Priority order:
1. .github/copilot-instructions.md
2. AGENTS.md in project root
3. Open files in editor
4. Recent files
5. Project structure
```

### 2. Standards Enforcement

Create `.github/copilot-instructions.md`:

```markdown
# GitHub Copilot Instructions

This project follows @hivellm/rulebook standards defined in AGENTS.md.

## Code Generation Rules

1. **Always follow AGENTS.md** for all code generation
2. **Tests required**: Minimum 95% coverage for all new code
3. **Quality checks**: Code must pass all checks before commit:
   - Type checking / Compilation
   - Linting (zero warnings)
   - All tests passing
   - Coverage threshold met
4. **Documentation**: Update /docs/ with all changes
5. **Structure**: Follow project structure from AGENTS.md

## Language-Specific Standards

### Rust
- Edition: 2024
- Format: `cargo +nightly fmt`
- Lint: `cargo clippy -- -D warnings`
- Test: `cargo test --workspace`

### TypeScript  
- Strict mode: enabled
- Format: Prettier
- Lint: ESLint
- Test: Vitest

### Python
- Version: 3.11+
- Format: Ruff/Black
- Lint: Ruff
- Type: mypy
- Test: pytest

## Error Handling

Follow patterns from AGENTS.md:
- Use Result<T, E> in Rust
- Custom error types
- Proper error propagation
- Never ignore errors

## Testing Patterns

- Tests in /tests directory
- Test-driven development
- Edge cases and error paths
- Integration tests where appropriate

## Documentation

- Inline docs for public APIs
- Update specs in /docs/specs/
- Update ROADMAP.md progress
- Add CHANGELOG.md entries
```

## Code Generation Patterns

### 1. Function Implementation

```rust
// Copilot sees this context:
/// Processes user input and returns validated data.
///
/// # Arguments
/// * `input` - Raw user input string
///
/// # Returns
/// * `Result<User, ValidationError>` - Validated user or error
///
/// # Errors
/// * `ValidationError::EmptyInput` - If input is empty
/// * `ValidationError::InvalidFormat` - If format is wrong
pub fn process_user_input(input: &str) -> Result<User, ValidationError> {
    // Copilot generates implementation following AGENTS.md patterns
}
```

### 2. Test Generation

```typescript
// Copilot sees this:
describe('UserService', () => {
  // Copilot generates comprehensive tests following AGENTS.md
  it('should create user with valid data', () => {
    // Arrange, Act, Assert pattern
  });

  it('should reject invalid email', () => {
    // Error case testing
  });

  it('should handle concurrent requests', () => {
    // Edge case testing
  });
});
```

### 3. Error Handling

```python
# Copilot sees pattern:
def fetch_user_data(user_id: str) -> dict[str, Any]:
    """
    Fetch user data from database.
    
    Args:
        user_id: User identifier
        
    Returns:
        User data dictionary
        
    Raises:
        ValidationError: If user_id is invalid
        DatabaseError: If database query fails
    """
    # Copilot generates with proper error handling
```

## Chat Command Patterns

### Feature Development

```
Good Chat Prompts:

"Generate user authentication following AGENTS.md:
- Use Result<T, E> for errors
- Include comprehensive tests (95%+ coverage)
- Add inline documentation
- Follow async patterns from AGENTS.md"

"Implement password hashing following AGENTS.md security patterns:
- Use bcrypt with recommended cost
- Add error handling
- Include tests for success and failure cases"
```

### Debugging

```
Good Chat Prompts:

"Debug this error following AGENTS.md error handling patterns:
[paste error]
Code: [paste code]
Expected: [describe expected behavior]"

"This function fails with [error]. Fix it following AGENTS.md patterns and add a test to prevent regression."
```

### Refactoring

```
Good Chat Prompts:

"Refactor this to follow AGENTS.md async patterns:
- Use Tokio for async operations
- Proper error propagation
- No blocking in async context
- Update tests accordingly"

"Improve error handling in this module following AGENTS.md:
- Use custom error types
- Proper error propagation
- Meaningful error messages
- Update tests for error cases"
```

### Code Review

```
Good Chat Prompts:

"Review this code against AGENTS.md standards:
- Check error handling
- Verify test coverage
- Check documentation
- Identify potential issues"

"Does this follow AGENTS.md patterns for [specific pattern]? Suggest improvements."
```

## Inline Suggestion Best Practices

### 1. Accept Suggestions When

```
✅ Follows coding style from AGENTS.md
✅ Includes proper error handling
✅ Has descriptive naming
✅ Matches project patterns
✅ Includes documentation
```

### 2. Reject Suggestions When

```
❌ Uses deprecated patterns
❌ Ignores error handling
❌ Has poor naming conventions
❌ Violates type safety
❌ Missing documentation
❌ Doesn't match project style
```

### 3. Modify Suggestions

```
Copilot suggestion → Review → Modify to match AGENTS.md → Accept
```

## Quality Assurance

### Pre-Commit Workflow

```
1. Let Copilot generate code
2. Review against AGENTS.md
3. Run type checker/compiler
4. Run linter (must pass with zero warnings)
5. Run tests (must be 100% passing)
6. Check coverage (must meet threshold)
7. Update documentation
8. Commit only if all pass
```

### Testing Workflow

```
1. Write function signature and doc comment
2. Copilot Chat: "Generate comprehensive tests for this following AGENTS.md"
3. Review generated tests
4. Add missing edge cases
5. Implement function (Copilot helps)
6. Run tests and fix until all pass
7. Verify coverage meets threshold
```

## Advanced Features

### 1. Multi-Line Completions

Trigger comprehensive implementations:

```rust
// Type just the signature, Copilot completes the rest following AGENTS.md
impl UserService {
    pub async fn create_user(&self, data: CreateUserData) -> Result<User, ServiceError> {
        // Copilot generates full implementation with:
        // - Input validation
        // - Database call
        // - Error handling
        // - Logging
    }
}
```

### 2. Slash Commands (Copilot Chat)

```
/explain - Explain selected code
/fix - Fix problems in code
/tests - Generate tests
/doc - Add documentation
/simplify - Simplify code
/help - Show available commands
```

### 3. Context Variables

```
@workspace - Include workspace context
@vscode - VS Code API context
#file - Reference specific file
#terminalLastCommand - Last terminal command
```

## IDE-Specific Integration

### VS Code

```json
// settings.json
{
  "github.copilot.enable": {
    "*": true,
    "yaml": false,
    "plaintext": false
  },
  "github.copilot.advanced": {
    "debug.overrideEngine": "copilot-chat"
  }
}
```

### JetBrains IDEs

```
Enable in: Settings → Tools → GitHub Copilot
Configure: Settings → Editor → GitHub Copilot
```

### Neovim

```lua
-- Using copilot.lua
require('copilot').setup({
  suggestion = { enabled = true },
  panel = { enabled = true }
})
```

## Troubleshooting

### Copilot Not Following Standards

```
Solution 1: Create/update .github/copilot-instructions.md
Solution 2: Reference AGENTS.md explicitly in prompts
Solution 3: Provide examples of correct patterns
Solution 4: Reject and regenerate with explicit standards reference
```

### Poor Code Quality

```
Solution 1: Add detailed doc comments
Solution 2: Use Chat instead of inline suggestions
Solution 3: Provide more context with open files
Solution 4: Specify requirements explicitly
```

### Inconsistent Results

```
Solution 1: Be more specific in prompts
Solution 2: Reference exact patterns from AGENTS.md
Solution 3: Provide examples of desired output
Solution 4: Use consistent terminology across project
```

## Best Practices

1. **Context is King**: Keep relevant files open, write detailed comments
2. **Review Everything**: Never blindly accept suggestions
3. **Standards First**: Always reference AGENTS.md for complex tasks
4. **Iterate**: Regenerate if result doesn't meet standards
5. **Test Everything**: Run quality checks after Copilot changes
6. **Document**: Use Copilot to maintain documentation alongside code
7. **Learn Patterns**: Study what works and refine your prompts

## Security Considerations

### 1. Code Review

```
Always review Copilot suggestions for:
- Hardcoded secrets (reject immediately)
- SQL injection vulnerabilities
- XSS vulnerabilities
- Insecure cryptography
- Authentication bypass
```

### 2. Sensitive Data

```
Never allow Copilot to:
- Generate API keys or secrets
- Include real user data in examples
- Use weak cryptography
- Skip authentication checks
```

### 3. Dependencies

```
Review suggested dependencies:
- Check for known vulnerabilities
- Verify maintenance status
- Use Context7 for latest safe versions
- Document security choices
```

## Performance Tips

1. **Keep Context Relevant**: Close unrelated files
2. **Write Clear Comments**: Better context = better suggestions
3. **Use Chat for Complex Tasks**: Inline for simple completions
4. **Reference Standards**: Point to AGENTS.md for consistency
5. **Provide Examples**: Show desired patterns in comments
6. **Iterate Quickly**: Accept/reject fast, refine as needed

<!-- COPILOT:END -->

