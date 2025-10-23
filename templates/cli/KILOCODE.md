<!-- KILOCODE:START -->
# Kilo Code Rules

**CRITICAL**: Specific rules and patterns for Kilo Code AI assistant.

## Kilo Code Overview

Kilo Code is a lightweight AI coding companion:

```bash
# Install
curl -sSL https://kilocode.dev/install.sh | bash

# Run
kilo

# With config
kilo --config .kilocode.toml
```

## Integration with AGENTS.md

### Configuration

Create `.kilocode.toml`:

```toml
[project]
standards = "AGENTS.md"
language_detection = true

[quality]
require_tests = true
min_coverage = 95
enforce_types = true
run_linter = true

[ai]
model = "gpt-4-turbo"
temperature = 0.2
context_window = "large"
```

### Starting Session

```bash
kilo --load AGENTS.md

"Follow all project standards from AGENTS.md"
```

## Kilo Code Commands

```
/load           - Load file
/code           - Generate code
/test           - Generate tests
/fix            - Fix bugs
/review         - Review code
/explain        - Explain code
/optimize       - Optimize
/standards      - Check standards
```

## Best Practices

### DO's ✅
- Always load AGENTS.md first
- Request tests with implementation
- Use `/standards` to verify
- Review generated code
- Follow project patterns

### DON'Ts ❌
- Don't skip standards check
- Don't accept untested code
- Don't ignore warnings
- Don't bypass quality gates

## Prompt Template

```
Feature: [Name]

/load AGENTS.md

From AGENTS.md apply:
- Language standards
- Testing approach
- Coverage requirements
- Type safety rules
- Documentation format

Implement with TDD.
```

<!-- KILOCODE:END -->

