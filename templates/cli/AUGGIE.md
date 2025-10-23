<!-- AUGGIE:START -->
# Auggie (Augment CLI) Rules

**CRITICAL**: Specific rules and patterns for Auggie AI coding assistant.

## Auggie Overview

Auggie is the Augment CLI for AI-powered development:

```bash
# Install
npm install -g @augment/cli

# Run
auggie

# With configuration
auggie --config .auggie.yml
```

## Integration with AGENTS.md

### 1. Starting Session

**CRITICAL**: Load AGENTS.md first:

```bash
# Start with AGENTS.md context
auggie --context AGENTS.md

# First command:
"Read AGENTS.md and strictly follow all coding standards, testing requirements, and quality gates defined there."
```

### 2. Project Configuration

Create `.auggie.yml` in project root:

```yaml
# Auggie Configuration
model: claude-3-5-sonnet
temperature: 0.2

# Auto-load context files
context_files:
  - AGENTS.md
  - README.md
  - docs/ROADMAP.md

# Quality enforcement
quality:
  require_tests: true
  min_coverage: 95
  run_linter: true
  run_formatter: true
  type_check: true

# Workflow
workflow:
  tdd_mode: true
  auto_commit: false
  create_branch: true
```

## Auggie Best Practices

### 1. Context-Aware Development

Auggie excels at understanding project context:

```
"Analyze the codebase structure following AGENTS.md:

1. Review existing patterns
2. Identify architectural decisions
3. Note testing strategies
4. Document conventions

Then implement [feature] matching these patterns."
```

### 2. TDD Workflow

**CRITICAL**: Auggie supports TDD natively:

```bash
# Enable TDD mode
auggie --tdd

# In conversation:
"Implement [feature] using TDD per AGENTS.md:
1. Write failing tests first
2. Implement minimum code to pass
3. Refactor while keeping tests green
4. Achieve 95%+ coverage"
```

### 3. Code Intelligence

```bash
# Smart code analysis
auggie analyze src/

# Suggest improvements
auggie improve --file src/module.ts --standards AGENTS.md

# Refactor intelligently
auggie refactor --target src/legacy/ --modern-patterns
```

## Auggie Commands

### Core Commands

```
/help           - Show all commands
/context <file> - Add file to context
/clear          - Clear conversation
/analyze        - Analyze code
/implement      - Implement feature
/test           - Generate tests
/refactor       - Refactor code
/review         - Code review
/explain        - Explain code
/docs           - Generate docs
```

### Quality Commands

```
/lint           - Run linter
/format         - Format code
/typecheck      - Check types
/coverage       - Check coverage
/security       - Security scan
/validate       - Validate against standards
```

## Integration Patterns

### 1. Feature Implementation

```
Feature: User Authentication

/context AGENTS.md
/context docs/ARCHITECTURE.md

Process from AGENTS.md:
1. Review specs
2. Write tests (TDD)
3. Implement with types
4. Document APIs
5. Verify quality gates

Language: TypeScript
Framework: [from AGENTS.md]
Coverage: 95%+

Please proceed step-by-step.
```

### 2. Code Review Mode

```
/context AGENTS.md
/review src/new-feature/

Review against:
- AGENTS.md standards
- Type safety
- Test coverage
- Documentation
- Security practices
- Performance

Provide actionable feedback.
```

### 3. Intelligent Refactoring

```
/context AGENTS.md
/refactor src/legacy-module.ts

Goals:
- Modernize to current patterns
- Improve type safety
- Enhance test coverage
- Maintain compatibility
- Follow AGENTS.md conventions

Show before/after comparison.
```

## Best Practices

### DO's ✅

- **Always** load AGENTS.md at session start
- **Use** `/context AGENTS.md` for every task
- **Enable** TDD mode for new features
- **Request** explanations for changes
- **Verify** all quality checks pass
- **Review** code before accepting
- **Use** incremental development
- **Document** as you go

### DON'Ts ❌

- **Never** skip AGENTS.md review
- **Never** accept untested code
- **Never** bypass quality gates
- **Don't** ignore type errors
- **Don't** skip documentation
- **Don't** commit without review
- **Don't** override standards

## Advanced Features

### 1. Multi-File Refactoring

Auggie can refactor across files:

```
"Refactor authentication system:

Files:
- src/auth/*.ts
- tests/auth/*.test.ts

Improvements:
- Extract common patterns
- Add missing types
- Improve error handling
- Enhance tests

Maintain AGENTS.md standards."
```

### 2. Contextual Code Generation

```
"Generate new service following project patterns:

/context AGENTS.md
/context src/services/user.service.ts

New service: Payment
Location: src/services/payment.service.ts

Match:
- Existing service structure
- Error handling patterns
- Test organization
- Type definitions
- Documentation style"
```

### 3. Intelligent Testing

```
/context AGENTS.md
/test src/calculator.ts

Generate tests:
- Unit tests for all methods
- Edge cases
- Error scenarios
- Integration tests
- Performance tests

Coverage target: 95%+
Framework: [from AGENTS.md]
```

## Prompt Templates

### New Feature

```
Implement: [Feature Name]

Context:
/context AGENTS.md
/context [relevant files]

Requirements from AGENTS.md:
- Language: [X]
- Testing: TDD approach
- Coverage: 95%+
- Documentation: Required
- Type safety: Strict

Deliverables:
1. Test files
2. Implementation
3. Documentation
4. Quality verification

Follow AGENTS.md patterns throughout.
```

### Bug Fix

```
Fix Bug: [Description]

/context AGENTS.md
/context [affected files]

Issue: [error message]
Location: [file:line]

Per AGENTS.md:
1. Write regression test
2. Fix root cause
3. Verify no side effects
4. Update docs if needed

All quality checks must pass.
```

### Code Modernization

```
Modernize: [Component]

/context AGENTS.md
/context [old code]

Goals:
- Latest language features
- Better type safety
- Improved tests
- Modern patterns
- AGENTS.md compliance

Maintain backward compatibility.
```

## Quality Checklist

Before accepting Auggie's suggestions:

- [ ] AGENTS.md standards followed
- [ ] Tests written and passing
- [ ] Coverage ≥ 95%
- [ ] No linting errors
- [ ] Types correct and strict
- [ ] Code formatted properly
- [ ] Documentation complete
- [ ] No security issues
- [ ] Performance acceptable
- [ ] Follows project patterns

## Tips for Success

1. **Context First**: Always load AGENTS.md
2. **Incremental**: Small, verifiable changes
3. **TDD Mode**: Use for new features
4. **Review Everything**: Don't auto-accept
5. **Ask Questions**: Understand the why
6. **Pattern Matching**: Show existing examples
7. **Quality Gates**: Enforce standards
8. **Documentation**: Update as you go

## Troubleshooting

### Auggie Not Following Standards

```
"Stop and review.

Re-read AGENTS.md section [X].
Your code doesn't comply with [specific rule].

Required:
- [standard 1]
- [standard 2]
- [standard 3]

Please revise to match AGENTS.md exactly."
```

### Insufficient Test Coverage

```
"/context AGENTS.md

Coverage is [X]%, below 95% requirement.

Add tests for:
- Uncovered functions
- Edge cases
- Error paths
- Integration scenarios

Use framework from AGENTS.md."
```

### Type Safety Issues

```
"/typecheck failed

Fix type errors per AGENTS.md:
- Use strict TypeScript
- No implicit any
- Proper generics
- Complete type definitions

Then verify with /typecheck."
```

## Integration with Development Workflow

### 1. Git Integration

```bash
# Auggie can create branches
auggie feature --name user-auth --branch

# Generate commits
auggie commit --conventional --lint

# PR descriptions
auggie pr --template AGENTS.md
```

### 2. CI/CD Integration

```bash
# Verify before push
auggie ci-check --standards AGENTS.md

# Pre-commit validation
auggie validate --all
```

### 3. Documentation Generation

```bash
# Generate API docs
auggie docs --api --format markdown

# Update README
auggie readme --update --include-examples
```

<!-- AUGGIE:END -->

