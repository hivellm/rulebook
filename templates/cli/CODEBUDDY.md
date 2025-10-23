<!-- CODEBUDDY:START -->
# CodeBuddy Code Rules

**CRITICAL**: Specific rules and patterns for CodeBuddy AI coding assistant.

## CodeBuddy Overview

CodeBuddy is an intelligent pair programming assistant:

```bash
# Install
npm install -g codebuddy-ai

# Run
codebuddy start

# With project context
codebuddy --project .
```

## Integration with AGENTS.md

### Project Setup

Create `.codebuddy.json`:

```json
{
  "model": "gpt-4-turbo",
  "context_awareness": true,
  "auto_load_files": ["AGENTS.md", "README.md"],
  "quality_checks": {
    "enforce_tests": true,
    "min_coverage": 95,
    "run_linter": true
  }
}
```

### Starting Session

```bash
# Load AGENTS.md
codebuddy load AGENTS.md

"Follow all standards from AGENTS.md for this project"
```

## CodeBuddy Commands

```
/load <file>    - Load file into context
/test           - Generate tests
/refactor       - Refactor code
/explain        - Explain code
/implement      - Implement feature
/review         - Code review
/docs           - Generate documentation
/fix            - Fix bugs
```

## Best Practices

### DO's ✅
- Always reference AGENTS.md
- Use `/load AGENTS.md` at start
- Request tests for all code
- Verify quality checks
- Review before applying

### DON'Ts ❌
- Never skip AGENTS.md standards
- Don't accept untested code
- Don't bypass linting
- Don't ignore type errors

## Prompt Template

```
Task: [Feature Name]

Context:
/load AGENTS.md

Requirements from AGENTS.md:
- Language standards
- Test coverage 95%+
- Type safety
- Documentation

Implement following TDD approach.
```

<!-- CODEBUDDY:END -->

