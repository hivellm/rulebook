<!-- {TOOL}:START -->
# {Tool Name} CLI Rules

**Tool**: {Brief description}

## Quick Start

```bash
{installation command}
```

## Usage

Always reference AGENTS.md in prompts:
```
"Follow @AGENTS.md standards. Implement [feature] with tests first (95%+ coverage)."
```

## Workflow

1. Include AGENTS.md in context (tool-specific method)
2. Request features with "@AGENTS.md" reference
3. Review generated code
4. Run quality checks: `npm run lint && npm test`

**Critical**: Reference AGENTS.md for consistent standards.

<!-- {TOOL}:END -->

