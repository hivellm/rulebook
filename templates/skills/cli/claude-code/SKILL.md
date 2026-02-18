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
claude --model claude-sonnet-4-20250514
```

## Essential Usage

```bash
# Always read AGENTS.md and CLAUDE.md first
claude "Read AGENTS.md and CLAUDE.md, then implement [feature] with tests"

# Key flags:
--model claude-sonnet-4-20250514  # Model selection (default: sonnet)
--dangerously-skip-permissions    # Skip permission prompts (use with caution)
--verbose                         # Debug mode
```

## ⚠️ CRITICAL: File Editing Rules

**MANDATORY**: When editing multiple files, Claude Code MUST edit files **SEQUENTIALLY**, one at a time.

### Why Sequential Editing is Required

Claude Code's Edit tool uses exact string matching for replacements. When multiple files are edited in parallel:
- The tool may fail to find the exact string in some files
- Race conditions can cause partial or corrupted edits
- Error recovery becomes impossible

### Correct File Editing Pattern

```
✅ CORRECT (Sequential):
1. Edit file A → Wait for confirmation
2. Edit file B → Wait for confirmation
3. Edit file C → Wait for confirmation

❌ WRONG (Parallel):
1. Edit files A, B, C simultaneously → Failures likely
```

### Implementation Rules

1. **NEVER call multiple Edit tools in parallel** for different files
2. **ALWAYS wait for each edit to complete** before starting the next
3. **Verify each edit succeeded** before proceeding
4. **If an edit fails**, retry that specific edit before moving on

## ⚠️ CRITICAL: Test Implementation Rules

**MANDATORY**: When implementing tests, Claude Code MUST write **complete, production-quality tests**.

### Forbidden Test Patterns

```typescript
// ❌ NEVER do this - placeholder tests
it('should work', () => {
  expect(true).toBe(true);
});

// ❌ NEVER do this - skipped tests
it.skip('should handle edge case', () => {});

// ❌ NEVER do this - incomplete assertions
it('should return data', () => {
  const result = getData();
  expect(result).toBeDefined(); // Too weak!
});

// ❌ NEVER do this - "simplify" by removing test cases
// Original had 10 test cases, don't reduce to 3
```

### Required Test Patterns

```typescript
// ✅ CORRECT - complete test with proper assertions
it('should return user data with correct structure', () => {
  const result = getUserById(1);
  expect(result).toEqual({
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: expect.any(Date),
  });
});

// ✅ CORRECT - test edge cases and error paths
it('should throw NotFoundError when user does not exist', () => {
  expect(() => getUserById(999)).toThrow(NotFoundError);
});

// ✅ CORRECT - test all branches
describe('validateEmail', () => {
  it('should return true for valid email', () => {...});
  it('should return false for missing @', () => {...});
  it('should return false for missing domain', () => {...});
  it('should return false for empty string', () => {...});
});
```

### Test Implementation Rules

1. **NEVER simplify tests** - Implement the full, complete test as originally designed
2. **NEVER skip test cases** - Every test case in the spec must be implemented
3. **NEVER use placeholder assertions** - Each assertion must verify actual behavior
4. **ALWAYS test error paths** - Exceptions, edge cases, and failure modes
5. **ALWAYS maintain coverage** - Tests must achieve the project's coverage threshold

## Workflow

1. **Always read AGENTS.md and CLAUDE.md first** for project standards
2. **Plan file changes before editing** - List all files that need modification
3. **Edit files sequentially** - One file at a time, verify each edit
4. **Write complete tests** - No placeholders, no simplifications
5. **Run quality checks**: `npm run lint && npm test`
6. **Verify coverage threshold** is met before committing

## Quality Gates

Before completing any task:
- [ ] All files edited successfully (sequential editing)
- [ ] All tests implemented completely (no placeholders)
- [ ] Linting passes with zero warnings
- [ ] All tests pass (100% pass rate)
- [ ] Coverage threshold met (check AGENTS.md for threshold)

**Critical**: Reference AGENTS.md and CLAUDE.md in prompts for consistent code generation.

<!-- CLAUDE_CODE:END -->
