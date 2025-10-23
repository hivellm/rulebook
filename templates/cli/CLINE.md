<!-- CLINE:START -->
# Cline CLI Rules

**CRITICAL**: Specific rules and patterns for Cline AI coding assistant.

## Cline Overview

Cline is a VS Code extension and CLI for AI-powered coding:

```bash
# Install VS Code extension
# Or use CLI:
npm install -g cline-cli

# Run
cline

# With configuration
cline --config .cline.json
```

## Integration with AGENTS.md

### 1. Starting Session

**CRITICAL**: Load AGENTS.md first:

```bash
# In VS Code Command Palette:
Cline: Add AGENTS.md to context

# In CLI:
cline --load AGENTS.md

# First instruction:
"Read and strictly follow AGENTS.md for all coding standards and practices."
```

### 2. Project Configuration

Create `.cline.json` in project root:

```json
{
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022",
  "auto_context_files": [
    "AGENTS.md",
    "README.md",
    "docs/ROADMAP.md"
  ],
  "quality_gates": {
    "require_tests": true,
    "run_linter": true,
    "check_types": true,
    "min_coverage": 95
  },
  "workspace_rules": "Always reference AGENTS.md before making changes"
}
```

## Cline Best Practices

### 1. Task-Based Workflow

Cline works best with clear tasks:

```
Task Template:
"Task: [feature name]

Reference: AGENTS.md section [X]

Requirements:
- Follow [language] standards from AGENTS.md
- Tests required (95%+ coverage)
- Type-safe implementation
- Documentation included

Steps:
1. Review existing code patterns
2. Write tests first
3. Implement feature
4. Verify quality checks pass"
```

### 2. Context Management

```
# Add files to context
/add AGENTS.md
/add src/**/*.ts
/add tests/**/*.test.ts

# Check current context
/context

# Clear context
/clear
```

### 3. Quality Enforcement

**MUST verify before accepting changes:**

```bash
# Cline should run these automatically:
- Linter check
- Type check
- Test execution
- Coverage report
- Format validation
```

## Cline Commands

### Core Commands

```
/help           - Show all commands
/add <files>    - Add files to context
/remove <file>  - Remove from context
/clear          - Clear conversation
/retry          - Retry last command
/undo           - Undo last change
/diff           - Show pending changes
/apply          - Apply suggested changes
/reject         - Reject suggestions
```

### Quality Commands

```
/lint           - Run linter
/test           - Run tests
/coverage       - Show coverage
/format         - Format code
/check          - Run all checks
```

## Integration Patterns

### 1. Feature Development

```
"Implement user authentication feature:

According to AGENTS.md:
- Language: TypeScript
- Framework: Vitest for tests
- Coverage: 95%+ required
- Style: ESLint + Prettier

Process:
1. /add AGENTS.md
2. Analyze existing auth patterns
3. Write tests first (TDD)
4. Implement with types
5. Run /check to verify
6. Update documentation"
```

### 2. Code Review Mode

```
"Review this PR against AGENTS.md standards:

/add AGENTS.md
/add src/new-feature.ts
/add tests/new-feature.test.ts

Check:
- Follows project conventions
- Tests comprehensive
- Types correct
- Documentation complete
- No linting errors"
```

### 3. Refactoring

```
"Refactor [component] to meet AGENTS.md standards:

/add AGENTS.md
/add src/[component].ts

Current issues:
- [list issues]

Expected:
- Clean code
- Better types
- Improved tests
- Maintained compatibility"
```

## Best Practices

### DO's ✅

- **Always** load AGENTS.md at session start
- **Use** `/add AGENTS.md` before any work
- **Review** diffs before applying with `/diff`
- **Run** `/check` after changes
- **Verify** tests pass before committing
- **Keep** context focused and relevant
- **Use** task-based workflow
- **Ask** for explanations

### DON'Ts ❌

- **Never** skip quality checks
- **Never** accept untested code
- **Never** bypass AGENTS.md standards
- **Don't** apply changes blindly
- **Don't** ignore type errors
- **Don't** skip documentation
- **Don't** commit failing tests

## Advanced Features

### 1. Multi-File Editing

Cline can edit multiple files:

```
"Update authentication across:
- src/auth/login.ts
- src/auth/register.ts  
- tests/auth/*.test.ts

Ensure consistency with AGENTS.md patterns"
```

### 2. Interactive Refinement

```
# Iterative improvement:
"The implementation is good but:
1. Add more edge case tests
2. Improve error messages
3. Add JSDoc comments per AGENTS.md
4. Extract common logic to utility"
```

### 3. Code Generation

```
"Generate a new module following AGENTS.md:

Module: UserService
Location: src/services/user.service.ts

Include:
- TypeScript interfaces
- Full implementation
- Comprehensive tests
- API documentation
- Error handling

Match patterns from existing services/"
```

## Prompt Templates

### Feature Request

```
Feature: [Name]

AGENTS.md Context:
- Language: [X]
- Testing: [Y]
- Coverage: [Z]%

Requirements:
1. TDD approach
2. Type-safe
3. Well-documented
4. Follows existing patterns

Deliverables:
- Implementation files
- Test files
- Updated documentation
- All quality checks passing
```

### Bug Fix

```
Bug Fix Request:

Issue: [description]
File: [path]
Error: [message]

AGENTS.md Standards:
- Add regression test
- Fix root cause
- Update docs if needed
- Verify no side effects

/add AGENTS.md
/add [affected files]
```

### Code Review

```
Code Review:

/add AGENTS.md
/add [files to review]

Review against:
- AGENTS.md standards
- Project conventions
- Test coverage
- Type safety
- Documentation
- Performance

Provide specific feedback and suggestions.
```

## Quality Checklist

Before applying Cline's changes:

- [ ] AGENTS.md standards followed
- [ ] Tests written and passing
- [ ] Coverage threshold met
- [ ] Linting passes
- [ ] Types correct
- [ ] Code formatted
- [ ] Documentation updated
- [ ] No console warnings
- [ ] Follows project patterns
- [ ] Changes reviewed with `/diff`

## Tips for Success

1. **Start Clean**: Always `/clear` before new task
2. **Context First**: Add AGENTS.md before coding
3. **Review Diffs**: Use `/diff` before `/apply`
4. **Incremental**: Make small, verifiable changes
5. **Test Early**: Request tests before implementation
6. **Ask Why**: Request explanations for decisions
7. **Verify**: Run `/check` frequently
8. **Document**: Update docs as you go

## Troubleshooting

### Cline Ignoring Standards

```
"Stop. Re-read AGENTS.md thoroughly.
Your suggestions don't follow [specific standard].
Please revise according to AGENTS.md section [X]."
```

### Test Coverage Issues

```
"/add AGENTS.md

The test coverage is below 95% required by AGENTS.md.
Add tests for:
- [untested scenario 1]
- [untested scenario 2]
- Edge cases
- Error conditions"
```

### Style Violations

```
"Run /lint

Fix all linting errors according to AGENTS.md rules:
- [specific rule violation]

Then run /format to apply correct style."
```

<!-- CLINE:END -->

