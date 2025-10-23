<!-- CODEX:START -->
# Codex Rules

**CRITICAL**: Specific rules and patterns for Codex AI code generation.

## Codex Overview

Codex is OpenAI's code generation model accessible via API and various tools:

```bash
# Via OpenAI API
export OPENAI_API_KEY=your_key

# Via GitHub Copilot CLI
gh copilot suggest

# Via OpenAI Playground
https://platform.openai.com/playground
```

## Integration with AGENTS.md

### API Usage

```python
import openai

# Load AGENTS.md as context
with open('AGENTS.md') as f:
    standards = f.read()

# Prompt with context
prompt = f"""
{standards}

Follow all standards above to implement:
[feature description]

Include:
- Tests (95%+ coverage)
- Type definitions
- Documentation
- Error handling
"""

response = openai.ChatCompletion.create(
    model="gpt-4-turbo",
    messages=[{"role": "user", "content": prompt}]
)
```

### Configuration

For tools using Codex, include AGENTS.md in system prompt:

```json
{
  "system_prompt": "You are an expert developer. Always reference and follow the coding standards in AGENTS.md. Never skip tests, types, or documentation.",
  "context_files": ["AGENTS.md"],
  "temperature": 0.2,
  "max_tokens": 4096
}
```

## Best Practices

### DO's ✅
- Include AGENTS.md in every prompt
- Be specific about requirements
- Request tests with code
- Verify output against standards
- Iterate on generated code
- Use temperature 0.2 for consistency

### DON'Ts ❌
- Don't use without AGENTS.md context
- Don't accept code without tests
- Don't skip type annotations
- Don't ignore linting errors
- Don't use high temperature for code

## Prompt Templates

### Feature Implementation

```
Context: [paste AGENTS.md relevant sections]

Task: Implement [feature name]

Requirements from AGENTS.md:
- Language: [X]
- Framework: [Y]
- Test coverage: 95%+
- Type safety: Strict
- Error handling: Comprehensive

Implementation should include:
1. Type definitions
2. Main implementation
3. Unit tests
4. Integration tests
5. API documentation
6. Error handling
7. Input validation

Follow TDD approach from AGENTS.md.
```

### Code Review

```
Review this code against AGENTS.md standards:

[paste AGENTS.md relevant sections]

Code to review:
```
[code]
```

Check for:
- Standards compliance
- Type safety
- Test coverage
- Documentation
- Error handling
- Performance
- Security

Provide specific feedback.
```

### Bug Fix

```
Context from AGENTS.md:
[paste relevant standards]

Bug: [description]
Error: [error message]
File: [path]

Fix requirements:
1. Identify root cause
2. Add regression test
3. Implement fix
4. Verify no side effects
5. Update docs if needed

Follow error handling patterns from AGENTS.md.
```

## Quality Checklist

For all Codex-generated code:

- [ ] AGENTS.md standards followed
- [ ] Tests included and passing
- [ ] Coverage ≥ 95%
- [ ] Types complete and correct
- [ ] Code formatted properly
- [ ] Documentation included
- [ ] Error handling robust
- [ ] No security issues
- [ ] Performance acceptable
- [ ] Linting passes

## Tips for Better Results

1. **Comprehensive Context**: Include full AGENTS.md sections
2. **Specific Requirements**: Be explicit about standards
3. **Examples**: Show existing patterns
4. **Iterative**: Refine in multiple prompts
5. **Verify**: Always check against AGENTS.md
6. **Test**: Run all quality checks
7. **Review**: Treat as PR requiring review

## Integration Examples

### With VS Code

```json
// settings.json
{
  "github.copilot.advanced": {
    "inlineSuggestCount": 3,
    "temperature": 0.2
  },
  "github.copilot.contextfiles": [
    "AGENTS.md",
    "README.md"
  ]
}
```

### With Cursor

```json
// .cursorrules
{
  "systemMessage": "Follow all standards from AGENTS.md",
  "contextFiles": ["AGENTS.md"],
  "requireTests": true
}
```

### With CLI Tools

```bash
# Add AGENTS.md to prompt
cat AGENTS.md task-description.txt | codex-cli generate

# With specific instructions
codex-cli generate \
  --context AGENTS.md \
  --task "implement user auth" \
  --with-tests \
  --coverage 95
```

<!-- CODEX:END -->

