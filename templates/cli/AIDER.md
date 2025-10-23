<!-- AIDER:START -->
# Aider CLI Rules

**CRITICAL**: Specific rules and patterns for Aider AI pair programming CLI.

## Aider Overview

Aider is an AI pair programming tool in your terminal:

```bash
# Install
pip install aider-chat

# Run
aider --model gpt-4

# With specific files
aider src/main.rs tests/main.test.rs
```

## Integration with AGENTS.md

### 1. Starting Session

Always start by referencing AGENTS.md:

```bash
# Add AGENTS.md to context
aider AGENTS.md

# Then in chat:
"Read AGENTS.md and follow all standards defined there"
```

### 2. Project Configuration

Create `.aider.conf.yml` in project root:

```yaml
# Model selection
model: gpt-4
edit-format: diff

# Files to always include
read:
  - AGENTS.md
  - docs/ROADMAP.md

# Linting
lint: true
lint-cmd:
  rust: "cargo clippy -- -D warnings"
  typescript: "npm run lint"
  python: "ruff check ."

# Testing
test-cmd:
  rust: "cargo test"
  typescript: "npm test"
  python: "pytest"

# Git integration
auto-commits: true
commit-prompt: true
dirty-commits: true

# Editor
editor: vim
```

## Command Patterns

### Basic Commands

```bash
# Add files to chat
/add src/auth.rs tests/auth.test.rs

# Add whole directory
/add src/

# Drop files from chat
/drop tests/

# Run shell command
/run cargo test

# Commit changes
/commit "Implement user authentication"

# Undo last change
/undo

# Show help
/help
```

### Feature Development

```bash
# Start Aider
aider AGENTS.md src/feature.rs tests/feature.test.rs

# In chat:
"Following AGENTS.md standards, implement feature X:
1. Write tests first in tests/feature.test.rs
2. Implement in src/feature.rs
3. Ensure 95%+ test coverage
4. Add proper error handling
5. Include inline documentation"

# Aider will:
# - Read AGENTS.md
# - Create/modify files
# - Run tests automatically
# - Show diffs for review
# - Commit when approved
```

### Test-Driven Development

```bash
aider AGENTS.md tests/new_feature.test.rs

# Chat:
"Create comprehensive tests for [feature] following AGENTS.md:
- Test happy path
- Test error conditions
- Test edge cases
- Achieve 95%+ coverage"

# Review tests, then:
/add src/new_feature.rs

# Chat:
"Now implement the feature to pass all tests, following AGENTS.md patterns"
```

### Refactoring

```bash
aider AGENTS.md src/module/

# Chat:
"Refactor this module following AGENTS.md async patterns:
- Use Tokio for async operations
- Proper error handling
- Update tests
- Maintain test coverage"

# Review changes
/diff

# If good, commit
/commit "Refactor module to async patterns"
```

### Debugging

```bash
aider AGENTS.md src/buggy.rs tests/buggy.test.rs

# Chat:
"This code has a bug: [describe bug and error]
Fix it following AGENTS.md error handling patterns
Add a test to prevent regression"

# Run tests after fix
/run cargo test
```

## Quality Assurance

### Pre-Commit Workflow

Aider can automatically:

```bash
# In .aider.conf.yml
lint: true
test: true
auto-lint: true

# This runs before commits:
1. Lint check (must pass)
2. Test run (must pass)
3. Only then commit
```

### Manual Verification

```bash
# Check linting
/run cargo clippy -- -D warnings
/run npm run lint
/run ruff check .

# Run tests
/run cargo test --workspace
/run npm test
/run pytest

# Check coverage
/run cargo llvm-cov
/run npm run test:coverage
/run pytest --cov
```

## Advanced Features

### 1. Multi-File Editing

```bash
# Add multiple files
aider AGENTS.md $(find src -name "*.rs")

# Request changes across files
"Rename function X to Y across all files, update tests, follow AGENTS.md"
```

### 2. Architect Mode

```bash
# Use architect for planning
aider --architect

# Chat:
"Plan implementation of payment system following AGENTS.md:
- Database schema
- API endpoints
- Error handling
- Tests
- Documentation"

# Architect creates plan, then:
aider --model gpt-4 $(cat files.txt)
# Implement the plan
```

### 3. Git Integration

```bash
# Auto-commit each change
aider --auto-commits

# Custom commit message
aider --commit-prompt

# Create branch for changes
git checkout -b feature/new-feature
aider AGENTS.md
```

### 4. Context Management

```bash
# Read-only files (for context)
aider --read AGENTS.md --read docs/specs/FEATURE.md src/feature.rs

# Edit specific files
aider AGENTS.md src/feature.rs tests/feature.test.rs

# Chat understands context from read-only files but only edits specified files
```

## Chat Patterns

### Pattern 1: New Feature

```
Session:
$ aider AGENTS.md

Chat:
> Following AGENTS.md, I want to implement user registration.
> Start by creating tests in tests/auth/registration.test.ts
> Then implement in src/auth/registration.ts
> Use the error handling patterns from AGENTS.md
> Ensure 95%+ coverage

Aider response:
> I'll create the tests first following TDD approach...
> [Creates tests]
> Review the tests, then I'll implement the feature

User:
> Looks good, proceed

Aider:
> [Implements feature]
> All tests pass ✓
> Coverage: 96%
> Ready to commit?

User:
> /commit "Add user registration with tests"
```

### Pattern 2: Bug Fix

```
Session:
$ aider AGENTS.md src/database.rs tests/database.test.rs

Chat:
> Bug: Database connection pool exhaustion
> Error: [paste error]
> Fix following AGENTS.md async patterns
> Add test to prevent regression

Aider:
> Analyzing the issue...
> I see the problem in connection handling
> Fixing to use proper Tokio spawn_blocking
> Adding test for concurrent connections
> [Shows diff]

User:
> /diff

Review, then:
> /commit "Fix connection pool exhaustion"
```

### Pattern 3: Code Review

```
Session:
$ aider --read AGENTS.md src/module.rs

Chat:
> Review this code against AGENTS.md standards
> Check for:
> - Error handling patterns
> - Test coverage
> - Documentation
> - Performance issues

Aider:
> Reviewing against AGENTS.md...
> Issues found:
> 1. Missing error propagation in function X
> 2. Test coverage is 78% (below 95% threshold)
> 3. Missing inline documentation
> 
> Should I fix these issues?

User:
> Yes, fix following AGENTS.md patterns

Aider:
> /add tests/module.test.rs
> [Fixes issues]
```

## Best Practices

### 1. Always Include AGENTS.md

```bash
# Start every session with AGENTS.md
aider AGENTS.md [other files]

# First command in chat
"Read and follow AGENTS.md for all changes"
```

### 2. Use Read-Only Context

```bash
# Include specs as read-only
aider --read docs/specs/*.md AGENTS.md src/feature.rs
```

### 3. Commit Frequently

```bash
# Enable auto-commits
aider --auto-commits

# Or commit manually after each feature
/commit "Descriptive message"
```

### 4. Run Tests Often

```bash
# After each change
/run npm test

# Before committing
/test
```

### 5. Review Diffs

```bash
# Always review before accepting
/diff

# Undo if something wrong
/undo
```

## Configuration Examples

### Rust Project

```yaml
# .aider.conf.yml
model: gpt-4
edit-format: diff

read:
  - AGENTS.md
  - Cargo.toml

lint: true
lint-cmd: "cargo clippy -- -D warnings && cargo fmt -- --check"

test-cmd: "cargo test --workspace"

auto-commits: false
commit-prompt: true
```

### TypeScript Project

```yaml
# .aider.conf.yml
model: gpt-4
edit-format: whole

read:
  - AGENTS.md
  - package.json
  - tsconfig.json

lint: true
lint-cmd: "npm run lint && npm run type-check"

test-cmd: "npm test"

auto-commits: true
dirty-commits: true
```

### Python Project

```yaml
# .aider.conf.yml
model: gpt-4
edit-format: diff

read:
  - AGENTS.md
  - pyproject.toml

lint: true
lint-cmd: "ruff check . && mypy ."

test-cmd: "pytest"

auto-commits: false
```

## Troubleshooting

### Aider Not Following Standards

```bash
Solution 1: Explicitly reference AGENTS.md in every request
Solution 2: Add AGENTS.md to read files in config
Solution 3: Remind in chat: "Remember to follow AGENTS.md standards"
```

### Changes Breaking Tests

```bash
Solution 1: Run tests after each change with /run
Solution 2: Enable test-cmd in config for automatic testing
Solution 3: Ask Aider to fix: "Tests failing, fix following AGENTS.md"
```

### Large Diffs

```bash
Solution 1: Use /diff to review before accepting
Solution 2: Break into smaller changes
Solution 3: Use /undo if changes too large
```

## Tips for Better Results

1. **Clear Instructions**: Be specific about requirements
2. **Reference Standards**: Always mention AGENTS.md
3. **Include Context**: Add relevant files to session
4. **Review Diffs**: Check changes before accepting
5. **Test Often**: Run tests after each change
6. **Commit Frequently**: Small, atomic commits
7. **Use Read-Only**: Include specs and docs as context

<!-- AIDER:END -->

