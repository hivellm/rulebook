<!-- CLINE:START -->
# Cline CLI Rules

**Tool**: VS Code extension with autonomous mode

## Quick Start

Install Cline extension in VS Code or use CLI mode.

## Usage

```bash
# In prompts, always reference standards:
"Follow @AGENTS.md. Implement [feature] with tests first (95%+ coverage)."

# Cline will:
- Read AGENTS.md
- Write tests
- Implement feature
- Run quality checks
```

## Workflow

1. Keep AGENTS.md open in workspace
2. Request features with "Follow @AGENTS.md" prefix
3. Search memory for similar past implementations before starting
4. Review proposed changes before approval
5. Verify tests pass after implementation
6. Save learnings to persistent memory

**Critical**: Reference @AGENTS.md in every prompt for consistent output.

## ⚠️ Token Optimization (CRITICAL)

**Minimize output to reduce token consumption:**

### DO ✅
- Output code directly
- Use code comments for explanations
- Return concise results: "✅ Done" instead of reports
- Combine multiple small outputs

### DON'T ❌
- **NEVER generate markdown reports** unless explicitly requested
- **NEVER use emoji status lines** (✅ Type check: Passed)
- **NEVER create "Quality Checks" sections** with status boxes
- **NEVER explain implementation details** in plain text
- **NEVER add "Next Steps" sections**

**Example**:
- ❌ BAD: "✅ Type check: Passed. ✅ Linting: 0 warnings. ✅ Tests: 45/45..." (500+ tokens)
- ✅ GOOD: "✅ Checks pass. Tests: 45/45." (~50 tokens)

## Persistent Memory Integration

### Before Implementation
Always search for past similar work:

```bash
# Search for feature implementations
rulebook memory search "your feature" --mode hybrid

# View specific implementation details
rulebook memory get <memory-id>
```

### Prompt Template with Memory
When requesting a feature, include memory context:

```
Follow @AGENTS.md and @.rulebook/memory.md.

Similar past implementations from memory:
[paste relevant memory summaries]

Implement [feature]...
```

### After Implementation
Cline's auto-capture may save learnings. Augment with additional context:

```bash
# Verify auto-captured memory
rulebook memory search "feature name" --type feature

# Add additional context if needed
rulebook memory save "Implementation details and patterns..." --type feature --title "Feature name"
```

## Memory-Aware Development

The memory system provides:
- **Pattern discovery**: Find reusable solutions from past work
- **Gotcha avoidance**: Learn from past edge cases
- **Decision context**: Understand architectural choices
- **Faster iteration**: Reference proven approaches

<!-- CLINE:END -->
