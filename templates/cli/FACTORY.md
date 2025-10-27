<!-- FACTORY:START -->
# Factory Droid Rules

**CRITICAL**: Specific rules and patterns for Factory Droid AI assistant.

## Factory Droid Overview

Factory Droid is an AI code generation and automation tool:

```bash
# Install
pip install factory-droid

# Run
factory-droid

# With template
factory-droid --template AGENTS.md
```

## Integration with AGENTS.md

### Configuration

Create `.factory-droid.yml`:

```yaml
templates:
  standards: AGENTS.md
  roadmap: docs/ROADMAP.md

generation:
  language_rules: AGENTS.md
  test_required: true
  coverage_min: 95
  
automation:
  format_on_save: true
  lint_on_save: true
  test_on_change: true
```

### Starting Session

```bash
factory-droid --load-standards AGENTS.md

"Generate code following all patterns and standards from AGENTS.md"
```

## Factory Droid Commands

```
/generate       - Generate code
/template       - Use template
/automate       - Automate task
/scaffold       - Scaffold structure
/optimize       - Optimize code
/standardize    - Apply standards
```

## Best Practices

### DO's ✅
- Load AGENTS.md as template
- Use for scaffolding
- Automate repetitive tasks
- Generate with tests
- Follow project patterns

### DON'Ts ❌
- Don't generate without context
- Don't skip standards
- Don't ignore tests
- Don't bypass quality checks

## Prompt Template

```
Generate: [Component]

Template: AGENTS.md

Include:
- Type definitions
- Implementation
- Tests (95%+ coverage)
- Documentation

Follow AGENTS.md patterns exactly.
```

## Post-Generation Workflow

**CRITICAL**: After generating code with Factory Droid, you MUST execute the complete quality workflow:

```bash
# Step 1: Quality checks
npm run type-check    # TypeScript/typed languages
npm run lint          # Must pass with zero warnings
npm test              # All tests must pass (100%)
npm run build         # Build must succeed

# Step 2: Security and dependencies
npm audit --production --audit-level=moderate
npm outdated

# Step 3: Coverage verification
npm run test:coverage  # Must meet 95% threshold

# Step 4-6: Follow standard automation workflow
# - Update OpenSpec tasks (if exists)
# - Update documentation (ROADMAP, CHANGELOG)
# - Commit with conventional format
```

**Integration with Project Standards:**
- Follow AGENTS.md patterns and standards
- Update OpenSpec STATUS.md when tasks complete
- Update CHANGELOG.md with changes
- Follow conventional commit format
- All tests must pass before committing

## Error Recovery

**When Factory Droid encounters issues:**

```bash
# Manual execution required:
# Run quality checks manually
npm test
npm run lint
npm run type-check
npm run build
npm run test:coverage
```

**When to abandon current approach:**
- Same error occurs 3+ times
- Quality checks fail repeatedly
- OpenSpec validation reveals fundamental mismatch
- Security audit blocks critical path
- Tests failing consistently

**Retry with alternative approach:**
- Review AGENTS.md for different implementation patterns
- Consider alternative architecture/design
- Check OpenSpec for alternative solutions
- Verify project dependencies are up to date
- Check for breaking changes in dependencies

**Quality Gate:**
Before proceeding with any retry:
- All local tests must pass (100%)
- Linting must pass with zero warnings
- Coverage must meet 95% threshold
- Build must succeed without errors

## CI/CD Integration

**Factory Droid with GitHub Actions:**

```yaml
# .github/workflows/factory-droid.yml
name: Factory Droid Quality Check
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Lint
        run: npm run lint
      
      - name: Test
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Coverage
        run: npm run test:coverage
```

**Best Practices:**
- Match local commands with CI/CD workflows
- Run same quality checks locally before commit
- Verify coverage threshold in CI matches local (95%)
- Ensure all checks pass locally to prevent CI failures

## Commands Reference

```bash
# Factory Droid commands
factory-droid --help
factory-droid --template AGENTS.md
factory-droid --generate component
factory-droid --scaffold module
factory-droid --automate workflow

# Quality checks (must pass before commit)
npm run type-check
npm run lint
npm test
npm run build
npm run test:coverage

# Security checks
npm audit
npm audit --production
npm outdated

# Documentation
npm run docs:generate  # Generate docs
npm run docs:serve     # Serve docs locally
```

<!-- FACTORY:END -->

