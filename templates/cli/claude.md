<!-- CLAUDE:START -->
# Claude API/CLI Rules

**Tool**: Anthropic Claude API with 200K context window

## Quick Start

```bash
export ANTHROPIC_API_KEY=your_key
# Use via API or compatible CLIs
```

## Usage

In API requests or CLI prompts, include:
```
"Follow these project standards from AGENTS.md:
[paste relevant AGENTS.md sections]

Implement [feature] with tests first (95%+ coverage)."
```

## Workflow

1. Include AGENTS.md content in system prompt or context
2. Request features with standards reference
3. Review generated code
4. Run quality checks
5. Capture knowledge/learnings/decisions

**Critical**: Claude has 200K context - paste full AGENTS.md for best results.

## Knowledge Capture

### Review Past Context
Before implementing a feature, review the file-based knowledge base for similar past work:

```bash
rulebook knowledge list
rulebook learn list
rulebook decision list
```

### Capture Implementation Insights
After completing implementation, record key learnings (committed with the repo):

- `rulebook_memory` — reusable patterns and anti-patterns.
- `rulebook_memory` — gotchas, edge cases, and performance insights.
- `rulebook_memory` — architectural decisions and their tradeoffs.

<!-- CLAUDE:END -->
