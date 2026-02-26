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
5. Save learnings to persistent memory

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

## Persistent Memory Integration

### Search for Past Context
Before implementing a feature, search memory for similar past work:

```bash
# Search for past implementations
rulebook memory search "feature name" --mode hybrid --type feature

# View timeline of related work
rulebook memory timeline --memoryId <id>
```

### Save Implementation Insights
After completing implementation, capture key learnings:

```bash
# Save feature implementation
rulebook memory save "Implemented [feature] with [approach]. Key decision: [why]. Gotcha: [edge case]. Pattern: [reusable solution]" --type feature --title "[Feature name]" --tags tag1,tag2

# Save bugfix insights
rulebook memory save "Fixed [bug] by [solution]. Root cause: [why it happened]. Test case: [added validation]" --type bugfix --title "[Bug description]" --tags bugfix,area

# Save architectural decisions
rulebook memory save "Chose [approach] over [alternative] because [reasoning]. Tradeoffs: [what was sacrificed]. Future implications: [impact on architecture]" --type decision --title "[Decision name]" --tags architecture,decision
```

### Use Context from Memory
When Claude Code returns, your memory system auto-captures learnings. Review and augment:
1. Search relevant memories: `rulebook memory search "your topic"`
2. Review 3-layer search results: compact → timeline → full details
3. Reference past patterns in new implementations

<!-- CLAUDE:END -->
