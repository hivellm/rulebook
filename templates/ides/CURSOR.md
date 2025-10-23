<!-- CURSOR:START -->
# Cursor IDE Rules

**CRITICAL**: Specific rules and patterns for Cursor AI IDE.

## Cursor-Specific Features

### 1. Agent Mode

Cursor's Agent mode allows autonomous coding with minimal supervision:

```
Best Practices:
- Provide clear, specific goals
- Reference @AGENTS.md for project standards
- Use @mentions for files and symbols
- Review all changes before accepting
```

### 2. File References

Use @ mentions to provide context:

```
@AGENTS.md - Reference project rules
@/path/to/file.rs - Reference specific files
@folder/ - Reference entire directories
```

### 3. Composer

Multi-file editing with Composer:

```
Guidelines:
- Plan changes across multiple files
- Review full diff before applying
- Test after applying multi-file changes
- Use for refactoring and large features
```

### 4. Chat Context

Maintain relevant context in chat:

```
Best Practices:
- Start with @AGENTS.md for new features
- Reference relevant specs from @/docs/specs/
- Include error messages and logs
- Clear context when switching tasks
```

## Code Generation Rules

### 1. Always Follow AGENTS.md

```
Rule: Every code generation MUST follow @AGENTS.md standards
- Check documentation structure
- Meet coverage thresholds
- Follow language-specific patterns
- Use project conventions
```

### 2. Test-Driven Development

```
Pattern:
1. Ask AI to write tests first
2. Then implement feature
3. Run tests and fix until passing
4. Check coverage meets threshold
```

Example prompt:
```
@AGENTS.md Write tests for user authentication in @/tests/auth.test.ts following our testing standards. Then implement the feature.
```

### 3. Documentation

```
Pattern:
1. Generate code with inline docs
2. Update relevant spec in @/docs/specs/
3. Update @/docs/ROADMAP.md progress
4. Update @CHANGELOG.md
```

## Chat Commands Best Practices

### Feature Implementation

```
Good:
"@AGENTS.md Implement user login following our Rust standards. Include tests with 95%+ coverage."

Bad:
"Create login"
```

### Bug Fixes

```
Good:
"Fix the authentication error in @/src/auth.rs. Error: [paste error]. Follow @AGENTS.md error handling patterns."

Bad:
"Fix this bug"
```

### Refactoring

```
Good:
"Refactor @/src/database/ to use connection pooling. Follow @AGENTS.md async patterns. Update tests."

Bad:
"Make database faster"
```

### Code Review

```
Good:
"Review @/src/api/users.rs against @AGENTS.md standards. Check for coverage, error handling, and documentation."

Bad:
"Is this code good?"
```

## Workflow Integration

### 1. Starting New Feature

```
1. Open Composer or Agent mode
2. Prompt: "@AGENTS.md @/docs/specs/FEATURE.md Implement [feature] following our standards"
3. Review generated code
4. Run quality checks (lint, test, coverage)
5. Commit when all checks pass
```

### 2. Debugging

```
1. Copy error message
2. Prompt: "Debug this error in @/src/file.rs: [error]. Follow @AGENTS.md patterns."
3. Apply fix
4. Run tests to verify
5. Update relevant docs
```

### 3. Code Review

```
1. Prompt: "Review this PR against @AGENTS.md"
2. Address feedback
3. Re-run quality checks
4. Update documentation
```

## Settings Recommendations

### .cursorrules File

Create `.cursorrules` in project root:

```
This project uses @hivellm/rulebook standards.

CRITICAL RULES:
1. Always reference @AGENTS.md before coding
2. Write tests first (95%+ coverage required)
3. Run quality checks before committing:
   - Type check / Compiler check
   - Linter (no warnings allowed)
   - All tests (100% pass rate)
   - Coverage check
4. Update docs/ when implementing features
5. Follow strict documentation structure

Language-specific rules are in @AGENTS.md.
Module-specific patterns are in @AGENTS.md.

When in doubt, ask to review @AGENTS.md first.
```

### Cursor Settings

Recommended settings in Cursor:

```json
{
  "cursor.general.enableShadowWorkspace": true,
  "cursor.chat.contextLength": "long",
  "cursor.cpp.disabledLanguages": [],
  "cursor.general.enableGhostText": true
}
```

## Common Patterns

### Pattern 1: Feature Implementation

```
User: "@AGENTS.md Implement user registration with email validation"

Cursor AI:
1. Checks @AGENTS.md for testing requirements
2. Checks language-specific patterns
3. Writes tests first in /tests/
4. Implements feature following patterns
5. Suggests running quality checks
6. Offers to update documentation
```

### Pattern 2: Debugging with Context

```
User: "@/src/auth.rs This function is failing with [error]. Fix following @AGENTS.md error handling."

Cursor AI:
1. Reads the file
2. Checks @AGENTS.md error patterns
3. Proposes fix with proper error types
4. Suggests adding test for error case
5. Updates inline documentation
```

### Pattern 3: Refactoring

```
User: "Refactor @/src/api/ to use new error handling from @AGENTS.md. Update all tests."

Cursor AI:
1. Scans all files in /src/api/
2. Checks @AGENTS.md error patterns
3. Refactors each file
4. Updates associated tests
5. Runs tests to verify
6. Suggests documentation updates
```

## Quality Assurance

### Before Accepting Changes

Always verify:

1. ✅ Code follows @AGENTS.md patterns
2. ✅ Tests are included and passing
3. ✅ Coverage meets threshold
4. ✅ Linter passes with no warnings
5. ✅ Documentation is updated
6. ✅ No breaking changes without migration plan

### After Accepting Changes

Run these commands:

```bash
# Language-specific checks (see @AGENTS.md)
npm run type-check && npm run lint && npm test
# OR
cargo clippy && cargo test
# OR
ruff check . && pytest
```

## Tips for Better Results

1. **Be Specific**: Reference exact files and requirements
2. **Provide Context**: Use @mentions liberally
3. **Follow Standards**: Always start with @AGENTS.md
4. **Verify Changes**: Review diffs carefully
5. **Test Everything**: Run quality checks after each change
6. **Iterate**: If result doesn't match standards, ask AI to fix
7. **Document**: Ask AI to update docs alongside code

## Troubleshooting

### AI Not Following Rules

```
Solution: Explicitly reference @AGENTS.md in prompt
Example: "@AGENTS.md You didn't follow our testing standards. Please add tests with 95%+ coverage."
```

### AI Missing Context

```
Solution: Use more @ references
Example: "@AGENTS.md @/docs/specs/AUTH.md @/src/auth.rs Implement this feature"
```

### Changes Breaking Tests

```
Solution: Ask AI to fix with context
Example: "Tests are failing. Fix @/src/feature.rs to pass all tests in @/tests/feature.test.ts"
```

## Advanced Usage

### Custom Instructions

Add to Cursor settings for this project:

```
Project-specific instructions:
- This project uses Rust Edition 2024
- All code must pass clippy with -D warnings
- Test coverage minimum: 95%
- Documentation in /docs/ only (except allowed root files)
- Reference @AGENTS.md for all patterns
```

### Keyboard Shortcuts

Learn these for efficiency:

- `Cmd/Ctrl + K`: Quick AI edit
- `Cmd/Ctrl + L`: Open chat
- `Cmd/Ctrl + I`: Inline AI completion
- `Cmd/Ctrl + Shift + L`: Agent mode

### Multi-File Operations

Use Composer for:

- Large refactorings across multiple files
- Feature implementation spanning multiple modules
- Migration to new patterns
- Test suite updates

<!-- CURSOR:END -->

