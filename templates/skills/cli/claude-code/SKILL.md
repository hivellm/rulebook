---
name: "Claude Code"
description: "Tool: Anthropic Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)"
version: "1.0.0"
category: "cli"
author: "Rulebook"
tags: ["cli", "cli-tool"]
dependencies: []
conflicts: []
---
<!-- CLAUDE_CODE:START -->
# Claude Code CLI Rules

**Tool**: Anthropic Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)

## Quick Start

```bash
export ANTHROPIC_API_KEY=your_key
claude "Read AGENTS.md and CLAUDE.md, then implement [feature] with tests"

# Key flags:
--model <model>                   # Model selection
--dangerously-skip-permissions    # Skip permission prompts (use with caution)
--verbose                         # Debug mode
```

## Test Implementation Rules

Write complete, production-quality tests:

1. **Never simplify tests** — implement the full test as designed
2. **Never skip test cases** — every case in the spec must be implemented
3. **No placeholder assertions** — `expect(true).toBe(true)` and bare `toBeDefined()` are forbidden; assert actual behavior
4. **No `.skip()` / `.only()`** to bypass failing tests
5. **Always test error paths** — exceptions, edge cases, failure modes
6. **Maintain coverage** — meet the project's coverage threshold

## Workflow

1. Read AGENTS.md and CLAUDE.md first for project standards
2. Plan file changes before editing
3. Write complete tests — no placeholders, no simplifications
4. Run quality checks: `npm run lint && npm test`
5. Verify coverage threshold before committing

## Quality Gates

- [ ] All tests implemented completely (no placeholders)
- [ ] Linting passes with zero warnings
- [ ] All tests pass (100% pass rate)
- [ ] Coverage threshold met (check AGENTS.md for threshold)

<!-- CLAUDE_CODE:END -->
