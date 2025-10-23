<!-- CODEIUM:START -->
# Codeium CLI Rules

**CRITICAL**: Specific rules and patterns for Codeium AI coding assistant.

## Codeium Overview

Codeium provides free AI-powered code completion and chat:

```bash
# Install Codeium CLI
npm install -g codeium

# Or use in IDE extensions
```

## Integration with AGENTS.md

### 1. Configuration

Create `.codeium/config.json` in project root:

```json
{
  "contextFiles": [
    "AGENTS.md",
    "docs/ROADMAP.md",
    "package.json"
  ],
  "indexingEnabled": true,
  "customInstructions": "Always follow standards defined in AGENTS.md. Generate code with 95%+ test coverage. Follow language-specific patterns from AGENTS.md for error handling, testing, and documentation."
}
```

### 2. Project Instructions

Create `.codeium/instructions.md`:

```markdown
# Codeium Instructions for This Project

This project uses @hivellm/rulebook standards.

## Critical Rules

1. **Read AGENTS.md** in project root for all standards
2. **Tests First**: Write tests before implementation (95%+ coverage)
3. **Quality Checks**: Must pass before commit
   - Type checking
   - Linting (zero warnings)
   - All tests (100% passing)
   - Coverage verification
4. **Documentation**: Update /docs/ with changes
5. **Structure**: Follow strict layout from AGENTS.md

## Language Standards

### Rust
- Edition 2024
- clippy with -D warnings
- cargo fmt (nightly)
- nextest for testing
- llvm-cov for coverage

### TypeScript
- Strict mode enabled
- ESLint + Prettier
- Vitest for testing
- 95%+ coverage

### Python
- Python 3.11+
- Ruff + Black
- mypy type checking
- pytest with coverage

## Workflow

1. Check /docs/specs/ for feature specs
2. Create tests in /tests/ first
3. Implement following AGENTS.md patterns
4. Run all quality checks
5. Update /docs/ROADMAP.md
6. Add CHANGELOG.md entry
```

## Usage Patterns

### 1. Autocomplete with Context

```typescript
// Codeium reads project context and suggests code
// following AGENTS.md patterns

// When you type function signature:
export async function validateUser(data: UserInput): Promise<Result<User, ValidationError>> {
  // Codeium suggests implementation following AGENTS.md:
  // - Proper error handling
  // - Input validation
  // - Type safety
  // - Documentation
}
```

### 2. Chat Interface

Use Codeium Chat for complex tasks:

```
User: "Following AGENTS.md, implement user authentication with JWT"

Codeium:
I'll implement following AGENTS.md TypeScript standards:

1. First, create tests in /tests/auth.test.ts:
[generates comprehensive tests with 95%+ coverage]

2. Then implement in /src/auth.ts:
[generates implementation with proper error handling]

3. Add types and documentation:
[generates type definitions and JSDoc]

All code follows AGENTS.md patterns for error handling,
testing, and documentation.
```

### 3. Refactoring Assistance

```
Select code block

Open Chat

User: "Refactor to follow AGENTS.md async patterns"

Codeium:
[analyzes current code]
[suggests refactoring following AGENTS.md Tokio patterns]
[updates tests accordingly]
[ensures no regressions]
```

## Code Generation Patterns

### 1. Test-Driven Development

```
// Write test first
describe('createUser', () => {
  it('should create user with valid data', async () => {
    // Codeium suggests test implementation
  });
});

// Then implement function
async function createUser(data: CreateUserInput) {
  // Codeium suggests implementation to pass tests
}
```

### 2. Error Handling

```rust
// Codeium follows AGENTS.md error patterns
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AuthError {
    #[error("Invalid credentials")]
    InvalidCredentials,
    
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
}

pub fn authenticate(credentials: &Credentials) -> Result<User, AuthError> {
    // Codeium suggests proper error handling
}
```

### 3. Documentation

```typescript
/**
 * Processes payment transaction.
 * 
 * @param transaction - Transaction details
 * @returns Promise resolving to transaction result
 * @throws {ValidationError} If transaction data invalid
 * @throws {PaymentError} If payment processing fails
 * 
 * @example
 * ```typescript
 * const result = await processPayment({
 *   amount: 100,
 *   currency: 'USD'
 * });
 * ```
 */
export async function processPayment(
  transaction: Transaction
): Promise<Result<TransactionResult, PaymentError>> {
  // Codeium suggests documented implementation
}
```

## Quality Assurance

### 1. Pre-Commit Checks

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running quality checks..."

# Type check
npm run type-check || exit 1

# Lint
npm run lint || exit 1

# Tests
npm test || exit 1

# Coverage
COVERAGE=$(npm run test:coverage | grep "All files" | awk '{print $4}' | sed 's/%//')
if (( $(echo "$COVERAGE < 95" | bc -l) )); then
  echo "Coverage $COVERAGE% < 95% required by AGENTS.md"
  exit 1
fi

echo "All checks passed!"
```

### 2. Automated Review

```typescript
// Use Codeium Chat for code review
async function reviewChanges() {
  const changes = await getGitDiff();
  
  // Ask Codeium to review
  const review = await codeiumChat({
    message: `Review these changes against AGENTS.md:\n\n${changes}`,
    context: ['AGENTS.md', ...changedFiles]
  });
  
  return review;
}
```

## Codeium-Specific Features

### 1. Multi-File Context

Codeium understands relationships between files:

```typescript
// In src/auth.ts
export class AuthService {
  // Codeium knows about tests/auth.test.ts
  // and suggests code that will pass existing tests
}

// In tests/auth.test.ts
// Codeium knows about src/auth.ts
// and suggests tests for all public methods
```

### 2. Language-Aware Suggestions

```python
# Codeium adapts to Python
def process_data(input: str) -> dict[str, Any]:
    """Process input data following AGENTS.md patterns."""
    # Suggests Python-idiomatic code
    # with proper type hints and error handling
```

```rust
// Codeium adapts to Rust
pub fn process_data(input: &str) -> Result<Data, ProcessError> {
    // Suggests Rust-idiomatic code
    // with ownership and borrowing handled correctly
}
```

### 3. Project-Wide Search

```
Chat: "Find all uses of deprecated function X"

Codeium:
Found 15 uses across 8 files:
- src/module1.rs:42
- src/module2.rs:103
[lists all occurrences]

Would you like me to refactor to use the new function Y
following AGENTS.md patterns?
```

## Best Practices

### 1. Provide Clear Context

```
// Good: Detailed function signature and docs
/// Validates user input following AGENTS.md validation patterns.
/// Returns Result with custom error types.
pub fn validate_user(input: &UserInput) -> Result<ValidatedUser, ValidationError> {
    // Codeium provides better suggestions
}

// Bad: Vague signature
fn validate(data: &str) -> bool {
    // Codeium suggestions may not follow standards
}
```

### 2. Use Chat for Complex Tasks

```
// Simple autocomplete
let x = user.name; // Codeium completes

// Complex refactoring
Chat: "Refactor entire module to use async/await following AGENTS.md Tokio patterns"
```

### 3. Review All Suggestions

```typescript
// Always review Codeium suggestions
// Accept if follows AGENTS.md
// Modify if needed
// Reject if violates standards

function processUser(data: UserData) {
  // Review Codeium's suggestion
  // Verify error handling matches AGENTS.md
  // Check test coverage
  // Ensure documentation complete
}
```

## Integration with Development Workflow

### 1. Feature Implementation

```
1. Read feature spec from /docs/specs/
2. Ask Codeium to generate tests (Chat)
3. Review and accept tests
4. Implement with Codeium autocomplete
5. Run quality checks
6. Ask Codeium to update docs (Chat)
7. Commit when all checks pass
```

### 2. Bug Fixing

```
1. Copy error message
2. Chat: "Fix this error following AGENTS.md: [error]"
3. Codeium suggests fix
4. Review and apply
5. Ask Codeium to add test for regression
6. Verify all tests pass
```

### 3. Code Review

```
1. Select code for review
2. Chat: "Review against AGENTS.md standards"
3. Codeium provides feedback
4. Address issues
5. Re-review until compliant
```

## Tips for Better Results

1. **Keep AGENTS.md Updated**: Codeium learns from it
2. **Use Descriptive Names**: Better suggestions
3. **Write Comments**: Guides Codeium's suggestions
4. **Accept Incrementally**: Build code step by step
5. **Use Chat for Planning**: Get structure before details
6. **Review Everything**: Don't blindly accept
7. **Provide Examples**: Show desired patterns in comments

## Troubleshooting

### Suggestions Not Following Standards

```
Solution 1: Update .codeium/instructions.md
Solution 2: Add more detail to function comments
Solution 3: Use Chat with explicit AGENTS.md reference
Solution 4: Provide example of desired pattern
```

### Inconsistent Code Style

```
Solution 1: Ensure linter is configured
Solution 2: Format code after accepting suggestions
Solution 3: Add style guide to .codeium/instructions.md
```

### Low Test Coverage

```
Solution 1: Use Chat to generate more tests
Solution 2: Ask explicitly for edge cases
Solution 3: Request specific coverage percentage
```

<!-- CODEIUM:END -->

