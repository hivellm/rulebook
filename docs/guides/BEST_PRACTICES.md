# Rulebook Best Practices

Guidelines for getting the most out of @hivellm/rulebook.

## Project Setup

### 1. Initialize Early

Set up rulebook at the start of your project:

```bash
# Right after creating project
cargo new my-project
cd my-project
npx @hivellm/rulebook init
```

**Why**: Establishes standards before code is written, preventing technical debt.

### 2. Commit AGENTS.md

Always commit AGENTS.md to version control:

```bash
git add AGENTS.md
git commit -m "Add rulebook standards"
```

**Why**: Ensures all team members and AI assistants follow the same rules.

### 3. Keep .rulesignore Minimal

Only ignore rules when absolutely necessary:

```
# Good: Specific exception with reason
coverage-threshold  # Legacy code, improving gradually

# Bad: Ignoring entire languages
typescript/*
```

**Why**: More rules = better code quality and consistency.

## Working with AI Assistants

### 1. Reference AGENTS.md in Prompts

Explicitly mention AGENTS.md in your requests:

```
@AGENTS.md Implement user authentication following our standards
```

**Why**: Ensures AI follows project-specific rules.

### 2. Request Compliance Checks

Ask AI to verify compliance:

```
Review this code against @AGENTS.md standards
```

**Why**: Catches violations before they reach code review.

### 3. Use Rulebook for Code Reviews

Reference AGENTS.md in PR reviews:

```
This doesn't follow our testing requirements in AGENTS.md.
Please add tests to meet 95% coverage threshold.
```

**Why**: Consistent, documented standards for reviews.

## Testing Standards

### 1. Write Tests First

Follow test-driven development:

```rust
// 1. Write test
#[test]
fn test_user_creation() {
    let user = create_user("test@example.com");
    assert_eq!(user.email, "test@example.com");
}

// 2. Implement feature
fn create_user(email: &str) -> User {
    // Implementation
}
```

**Why**: Ensures complete test coverage and clear requirements.

### 2. Meet Coverage Threshold

Always meet or exceed the configured threshold:

```bash
# Check coverage
cargo llvm-cov  # Rust
npm run test:coverage  # TypeScript
pytest --cov  # Python

# Must be >= 95% (or configured threshold)
```

**Why**: High coverage reduces bugs and improves maintainability.

### 3. Test Edge Cases

Don't just test happy paths:

```typescript
describe('validateEmail', () => {
  it('accepts valid email', () => { ... });
  it('rejects empty string', () => { ... });
  it('rejects missing @', () => { ... });
  it('rejects invalid TLD', () => { ... });
  it('handles unicode characters', () => { ... });
});
```

**Why**: Edge cases are where bugs hide.

## Documentation Standards

### 1. Follow Strict Structure

Keep documentation organized with allowed root files and `/docs`:

```
root/
├── README.md           # Overview (allowed)
├── CHANGELOG.md        # History (allowed)
├── AGENTS.md          # AI rules (allowed)
├── LICENSE            # License (allowed)
├── CONTRIBUTING.md    # Contributing (allowed)
├── CODE_OF_CONDUCT.md # Conduct (allowed)
├── SECURITY.md        # Security (allowed)
└── docs/              # All other docs
    ├── ROADMAP.md
    ├── ARCHITECTURE.md
    ├── specs/
    ├── guides/
    └── diagrams/
```

**Why**: Easy to find documentation, reduces clutter, follows open source standards.

### 2. Update as You Go

Don't let documentation fall behind:

```bash
# After implementing feature
1. Update /docs/ROADMAP.md (mark as complete)
2. Update /docs/specs/feature.md (actual implementation)
3. Update CHANGELOG.md (note changes)
```

**Why**: Stale documentation is worse than no documentation.

### 3. Document Decisions

Use Architecture Decision Records (ADRs):

```markdown
# docs/decisions/001-use-tokio.md

## Context
Need async runtime for server.

## Decision
Use Tokio instead of async-std.

## Consequences
+ Industry standard
+ Large ecosystem
- Slightly more complex
```

**Why**: Preserves reasoning for future developers.

## Dependency Management

### 1. Always Check Context7

Before adding dependencies:

```bash
# In AI assistant
Use Context7 to check latest version of tokio
Add tokio with recommended features
Document why we chose tokio
```

**Why**: Latest versions have security fixes and improvements.

### 2. Document Version Choices

Add comments in dependency files:

```toml
# Cargo.toml
[dependencies]
# Using 1.35 for new tokio::select! macro
tokio = { version = "1.35", features = ["full"] }
```

**Why**: Helps future maintainers understand constraints.

### 3. Regular Updates

Keep dependencies current:

```bash
# Monthly dependency updates
cargo update  # Rust
npm update    # TypeScript
poetry update # Python
```

**Why**: Prevents accumulation of breaking changes.

## Code Quality

### 1. Zero Warnings Policy

Fix all linter warnings:

```bash
# Must pass with no warnings
cargo clippy --workspace -- -D warnings
npm run lint
ruff check .
```

**Why**: Warnings become technical debt quickly.

### 2. Format Before Commit

Always format code:

```bash
# Git pre-commit hook
cargo +nightly fmt --all
npm run format
ruff format .
```

**Why**: Consistent formatting reduces diff noise.

### 3. Use Quality Gates

Set up CI/CD to enforce standards:

```yaml
# .github/workflows/quality.yml
- name: Check formatting
  run: cargo +nightly fmt --all -- --check
- name: Run clippy
  run: cargo clippy -- -D warnings
- name: Run tests
  run: cargo test
- name: Check coverage
  run: cargo llvm-cov --fail-under-lines 95
```

**Why**: Automated enforcement prevents violations.

## Module Usage

### Vectorizer

Use for codebase exploration:

```
Use Vectorizer to find all authentication implementations
Use Vectorizer to get project outline
Use Vectorizer to find files related to user management
```

**Why**: Faster than manual file searching.

### Synap

Use for task tracking:

```
Store current task in Synap: synap_kv_set("task:current", {...})
Track test results in Synap
Store session state before context switch
```

**Why**: Preserves state across context windows.

### OpenSpec

Use for significant changes:

```
Create OpenSpec proposal for new API design
Review existing specs before implementing
Update specs with actual implementation
```

**Why**: Structured planning prevents mistakes.

### Context7

Use for dependencies:

```
Check Context7 for latest axum version
Review Context7 docs for axum routing best practices
Verify security advisories in Context7
```

**Why**: Up-to-date information prevents issues.

## Team Collaboration

### 1. Consistent Rules

Ensure all team members use the same AGENTS.md:

```bash
# Pull latest rules
git pull origin main
# Verify AGENTS.md is current
git log -1 AGENTS.md
```

**Why**: Consistency across team.

### 2. Rule Changes via PR

Update rules through pull requests:

```bash
# Create branch
git checkout -b update-coverage-threshold
# Update AGENTS.md
npx @hivellm/rulebook init
# Commit and PR
git commit -am "Increase coverage threshold to 98%"
```

**Why**: Allows team discussion and review.

### 3. Document Exceptions

When using .rulesignore, document why:

```
# .rulesignore

# Legacy auth module has 78% coverage
# See issue #123 for improvement plan
auth/legacy/*
```

**Why**: Prevents cargo-cult rule ignoring.

## Continuous Improvement

### 1. Regular Reviews

Review and update rules quarterly:

```bash
# Every quarter
npx @hivellm/rulebook init
# Review new features
# Update thresholds if team improved
# Add new modules if adopted
```

**Why**: Rules evolve with project maturity.

### 2. Measure Impact

Track metrics:

```
- Bug count before/after rulebook
- Code review time
- Time to onboard new developers
- Test coverage trends
```

**Why**: Data-driven improvement.

### 3. Share Learnings

Document what works:

```markdown
# docs/guides/lessons-learned.md

## What Worked
- 95% coverage caught 3 major bugs early
- Strict docs made onboarding 50% faster
- .rulesignore helped with legacy code

## What Didn't
- 100% coverage was too strict for utils
- Enforcing all clippy lints created noise
```

**Why**: Helps other teams and projects.

## Anti-Patterns to Avoid

### ❌ Ignoring All Rules

```
# .rulesignore
*  # DON'T DO THIS
```

**Why**: Defeats the purpose of rulebook.

### ❌ Outdated AGENTS.md

```bash
# Last updated 2 years ago
git log -1 AGENTS.md
```

**Why**: Stale rules are misleading.

### ❌ Inconsistent Application

```
# Some files follow rules, some don't
```

**Why**: Partial compliance is confusing.

### ❌ Overriding AI Judgment

```
Ignore AGENTS.md, just make it work
```

**Why**: Bypasses quality standards.

## Summary

1. ✅ Initialize early in project lifecycle
2. ✅ Commit AGENTS.md to version control
3. ✅ Write tests first, meet coverage thresholds
4. ✅ Keep documentation current in /docs
5. ✅ Use Context7 for dependency management
6. ✅ Enforce quality with CI/CD
7. ✅ Leverage MCP modules (Vectorizer, Synap, etc.)
8. ✅ Review and update rules regularly
9. ✅ Measure impact and improve
10. ✅ Document exceptions and learnings

