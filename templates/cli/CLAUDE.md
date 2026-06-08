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

## ⚠️ Token Optimization (CRITICAL)

**MINIMIZE unnecessary output to reduce token consumption:**

### DO ✅
- Output code directly without explanations
- Use code comments for complex logic instead of markdown
- Return results concisely: "✅ Done" or "❌ Error: reason"
- Use tables only when absolutely necessary
- Combine multiple small outputs into single response

### DON'T ❌
- **NEVER generate markdown reports or summaries** unless explicitly requested
- **NEVER use excessive heading levels** (#, ##, ###, etc.)
- **NEVER create "Quality Checks" sections** with status boxes
- **NEVER output commit messages verbatim** - just say "committed"
- **NEVER explain what you did** - assume user knows project structure
- **NEVER use emoji status lines** (✅ Type check: Passed) - too verbose
- **NEVER generate "Next Steps" sections** - just do the work
- **NEVER output implementation details in plain text** - put in code comments

### Example: BAD (Wastes Tokens)
```
✅ Implementation Complete

📝 Changes:
- Added UserService class
- Added authentication middleware
- Updated routes configuration

🧪 Quality Checks:
- ✅ Type check: Passed
- ✅ Linting: Passed (0 warnings)
- ✅ Tests: 45/45 passed (100%)
- ✅ Coverage: 96% (threshold: 95%)

📊 Summary:
This implementation adds...

Next Steps:
1. Review the code
2. Deploy to production
```

### Example: GOOD (Efficient)
```
✅ Done. UserService added with auth middleware.
```

Put details in code comments, not markdown.

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

- `rulebook_knowledge_add` — reusable patterns and anti-patterns.
- `rulebook_learn_capture` — gotchas, edge cases, and performance insights.
- `rulebook_decision_create` — architectural decisions and their tradeoffs.

<!-- CLAUDE:END -->
