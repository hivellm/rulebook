<!-- WINDSURF:START -->
# Windsurf IDE Rules

**CRITICAL**: Specific rules and patterns for Windsurf AI IDE.

## Windsurf-Specific Features

### 1. Cascade AI

Windsurf's Cascade provides autonomous multi-step coding:

```
Best Practices:
- Start with clear goal and @AGENTS.md reference
- Let Cascade plan multiple steps
- Review plan before execution
- Monitor progress and intervene if needed
```

### 2. Flow State

Windsurf's Flow State for seamless coding:

```
Guidelines:
- Stay in flow with minimal interruptions
- Use AI for boilerplate and repetitive tasks
- Focus on architecture and logic
- Let AI handle formatting and documentation
```

### 3. Context Awareness

Windsurf automatically maintains context:

```
Features:
- Auto-includes relevant files
- Understands project structure
- Learns from AGENTS.md
- Adapts to coding patterns
```

## Code Generation Rules

### 1. Standards Compliance

```
Rule: All generated code MUST comply with @AGENTS.md

Enforcement:
- Reference @AGENTS.md at start of session
- Cascade checks standards automatically
- Review generated code for compliance
- Reject if standards not met
```

### 2. Test-First Development

```
Pattern with Cascade:
1. Request: "Plan feature with tests"
2. Cascade creates test plan
3. Approve plan
4. Cascade implements tests
5. Cascade implements feature
6. Cascade runs tests and fixes
```

Example:
```
"@AGENTS.md Plan and implement user authentication with comprehensive tests following our standards"
```

### 3. Documentation Integration

```
Cascade automatically:
- Generates inline documentation
- Updates relevant specs
- Updates ROADMAP.md progress
- Creates CHANGELOG entries
```

## Cascade Command Patterns

### Feature Development

```
Good:
"@AGENTS.md Implement JWT authentication for our API. Include tests (95%+ coverage), error handling, and documentation."

Better:
"Following @AGENTS.md standards, implement JWT authentication:
1. Create tests in /tests/auth.test.ts
2. Implement in /src/auth.rs
3. Add error types from @AGENTS.md patterns
4. Update @/docs/specs/AUTH.md
5. Update @CHANGELOG.md"
```

### Refactoring

```
Good:
"Refactor database module to use connection pooling. Follow @AGENTS.md async patterns."

Better:
"Multi-step refactoring following @AGENTS.md:
1. Analyze current database connections
2. Design connection pool
3. Update all database calls
4. Update tests
5. Verify performance improvement"
```

### Debugging

```
Good:
"Fix authentication bug: [error]. Follow @AGENTS.md error handling."

Better:
"Debug authentication error:
Error: [paste full error]
File: @/src/auth.rs
Expected behavior: [describe]
Follow @AGENTS.md error handling patterns"
```

## Workflow Integration

### 1. Session Start

```
1. Open project in Windsurf
2. First command: "Review @AGENTS.md standards"
3. Start feature: Reference @/docs/specs/
4. Let Cascade plan implementation
5. Review and approve plan
6. Monitor execution
```

### 2. During Development

```
Cascade Pattern:
- Auto-follows @AGENTS.md rules
- Creates tests automatically
- Runs quality checks
- Updates documentation
- Suggests improvements
```

### 3. Before Commit

```
Verification:
- All tests passing
- Coverage threshold met
- Linter clean
- Documentation updated
- @AGENTS.md compliance verified
```

## Configuration

### .windsurfrules File

Create `.windsurfrules` in project root:

```markdown
# Project Standards

This project uses @hivellm/rulebook for standardization.

## Critical Rules

1. **Always check @AGENTS.md** before generating code
2. **Tests first**: Minimum 95% coverage required
3. **Quality gates**: All must pass before commit
   - Type checking
   - Linting (zero warnings)
   - All tests (100% pass)
   - Coverage verification
4. **Documentation**: Update /docs/ with all changes
5. **Structure**: Follow strict documentation layout

## Language Rules

See @AGENTS.md for:
- Rust: Edition 2024, clippy, testing
- TypeScript: ESLint, Prettier, Vitest
- Python: Ruff, Black, mypy, pytest

## Module Patterns

See @AGENTS.md for:
- Vectorizer: Semantic search patterns
- Synap: KV store and task tracking
- OpenSpec: Proposal workflow
- Context7: Dependency management
```

### Windsurf Settings

Recommended workspace settings:

```json
{
  "windsurf.ai.enabled": true,
  "windsurf.cascade.autoRun": false,
  "windsurf.flow.enabled": true,
  "windsurf.context.autoInclude": true,
  "windsurf.ai.model": "gpt-4",
  "windsurf.cascade.reviewBeforeRun": true
}
```

## Cascade Patterns

### Pattern 1: Full Feature Implementation

```
Request:
"@AGENTS.md Implement complete user management feature:
- CRUD operations
- Input validation
- Authentication/authorization
- 95%+ test coverage
- Full documentation"

Cascade will:
1. Plan all components
2. Create test suite
3. Implement each operation
4. Add error handling
5. Generate documentation
6. Run all quality checks
7. Update ROADMAP.md
```

### Pattern 2: Bug Investigation and Fix

```
Request:
"Investigate and fix: [describe bug]
Error log: [paste log]
Follow @AGENTS.md debugging patterns"

Cascade will:
1. Analyze error and context
2. Locate root cause
3. Propose fix with explanation
4. Implement fix
5. Add test to prevent regression
6. Verify all tests pass
```

### Pattern 3: Code Review and Improvement

```
Request:
"Review and improve @/src/module/ against @AGENTS.md standards"

Cascade will:
1. Analyze code quality
2. Check standards compliance
3. Identify improvements
4. Refactor code
5. Update tests
6. Verify improvements
```

## Quality Assurance

### Automatic Checks

Cascade can automatically:

1. ✅ Run linter before showing code
2. ✅ Run tests after implementation
3. ✅ Check coverage threshold
4. ✅ Verify @AGENTS.md compliance
5. ✅ Update documentation
6. ✅ Format code

### Manual Verification

Always review:

1. Generated code logic
2. Test coverage completeness
3. Error handling correctness
4. Documentation accuracy
5. Breaking changes impact

## Advanced Features

### 1. Multi-Step Planning

```
Use Cascade for complex tasks:
"Plan implementation of payment system:
- Stripe integration
- Webhook handling
- Database transactions
- Error handling
- Tests and docs
Follow @AGENTS.md patterns"
```

### 2. Intelligent Refactoring

```
Cascade understands context:
"Refactor to use dependency injection throughout @/src/
Follow @AGENTS.md patterns
Update all tests"
```

### 3. Documentation Generation

```
Cascade generates comprehensive docs:
"Generate API documentation for @/src/api/
Format: OpenAPI 3.0
Include examples and error responses
Follow @AGENTS.md documentation standards"
```

## Tips for Better Results

1. **Clear Goals**: Be specific about what you want
2. **Provide Context**: Reference @AGENTS.md and specs
3. **Review Plans**: Always review Cascade's plan before execution
4. **Iterative Improvement**: Let Cascade refine solutions
5. **Monitor Progress**: Watch execution, intervene if needed
6. **Verify Results**: Run quality checks after completion
7. **Learn Patterns**: Cascade learns from your preferences

## Troubleshooting

### Cascade Not Following Standards

```
Solution: Reinforce @AGENTS.md at start
Example: "Stop. Review @AGENTS.md first, then redo following our testing standards."
```

### Over-Aggressive Changes

```
Solution: Enable review mode
Setting: "windsurf.cascade.reviewBeforeRun": true
Or: Break into smaller steps
```

### Missing Context

```
Solution: Explicitly reference files
Example: "@AGENTS.md @/docs/specs/FEATURE.md @/src/feature.rs Implement following both specs"
```

## Keyboard Shortcuts

Essential shortcuts for Windsurf:

- `Cmd/Ctrl + Shift + Space`: Activate Cascade
- `Cmd/Ctrl + K`: Quick edit
- `Cmd/Ctrl + /`: Toggle Flow State
- `Cmd/Ctrl + .`: Quick actions

## Best Practices

### 1. Session Management

```
- Start each session with @AGENTS.md review
- Use Cascade for multi-step tasks
- Stay in Flow for focused coding
- Review all changes before committing
```

### 2. Code Quality

```
- Let Cascade run quality checks
- Never accept code that fails linter
- Verify coverage meets threshold
- Review generated tests for completeness
```

### 3. Documentation

```
- Let Cascade update docs automatically
- Verify accuracy of generated docs
- Ensure consistency across documentation
- Keep ROADMAP.md current
```

<!-- WINDSURF:END -->

