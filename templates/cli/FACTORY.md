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

<!-- FACTORY:END -->

