<!-- OPENCODE:START -->
# OpenCode Rules

**CRITICAL**: Specific rules and patterns for OpenCode AI assistant.

## OpenCode Overview

OpenCode is an open-source AI coding assistant:

```bash
# Install
npm install -g opencode-cli

# Run  
opencode

# With project
opencode --project-root .
```

## Integration with AGENTS.md

### Configuration

Create `.opencode.json`:

```json
{
  "model": "gpt-4",
  "standards_file": "AGENTS.md",
  "auto_context": true,
  "quality": {
    "tests_required": true,
    "coverage_threshold": 95,
    "strict_types": true
  }
}
```

### Starting Session

```bash
opencode --standards AGENTS.md

"Apply all coding standards from AGENTS.md to this project"
```

## OpenCode Commands

```
/context        - Add context
/implement      - Implement feature
/test           - Generate tests
/review         - Review code
/refactor       - Refactor code
/docs           - Generate docs
/standards      - Check standards
```

## Best Practices

### DO's ✅
- Reference AGENTS.md always
- Use `/standards` to verify
- Generate comprehensive tests
- Follow type safety rules
- Document all code

### DON'Ts ❌
- Don't skip AGENTS.md
- Don't generate without tests
- Don't ignore linting
- Don't bypass checks

## Prompt Template

```
Implement: [Feature]

Standards: AGENTS.md

Requirements:
- Follow language patterns
- TDD approach
- 95%+ coverage
- Full documentation
- Type-safe code

Verify compliance with /standards.
```

<!-- OPENCODE:END -->

