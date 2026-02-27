<!-- GEMINI:START -->
# Gemini CLI Rules

**Tool**: Google Gemini API with 2M token context

## Quick Start

```bash
# Install gemini CLI
npm install -g @google/generative-ai-cli

# Set API key
export GEMINI_API_KEY=your_key
```

## Usage

```bash
# Always reference AGENTS.md:
gemini --prompt "Read @AGENTS.md. Implement [feature] with tests (95%+ coverage)."

# Include files:
gemini --files AGENTS.md,src/feature.ts
```

## Workflow

1. Include AGENTS.md in context with `--files AGENTS.md`
2. Request: "Follow @AGENTS.md. Implement [feature] with tests."
3. Review output
4. Run quality checks: `npm run lint && npm test`

**Critical**: Reference @AGENTS.md for consistent code generation.

<!-- GEMINI:END -->
