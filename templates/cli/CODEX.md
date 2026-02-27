<!-- CODEX:START -->
# Codex (OpenAI) Rules

**Tool**: OpenAI code generation API

## Usage

Include AGENTS.md content in API system prompt:
```
System: "Follow these standards: [AGENTS.md content]"
User: "Implement [feature] with tests (95%+ coverage)."
```

## Workflow

1. Paste AGENTS.md into system prompt
2. Request features
3. Review code
4. Run quality checks

<!-- CODEX:END -->
