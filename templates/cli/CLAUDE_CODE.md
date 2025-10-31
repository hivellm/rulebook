<!-- CLAUDE_CODE:START -->
# Claude Code CLI Rules

**Tool**: Anthropic Claude coding assistant (`npm install -g @anthropic-ai/claude-code`)

## Quick Start

```bash
export ANTHROPIC_API_KEY=your_key
claude-code --model claude-3-5-sonnet --files AGENTS.md
```

## Essential Usage

```bash
# Load AGENTS.md for standards
claude-code --files AGENTS.md --task "Implement [feature] following AGENTS.md with tests"

# Key flags:
--model claude-3-5-sonnet    # Model selection
--files AGENTS.md            # Include standards
--stream                     # Real-time output
--verbose                    # Debug mode
```

## Workflow

1. Always include `--files AGENTS.md` for project standards
2. Request: "Follow AGENTS.md. Implement [feature] with tests (95%+ coverage)"
3. Review generated code
4. Run quality checks: `npm run lint && npm test`

**Critical**: Reference AGENTS.md in prompts for consistent code generation.

<!-- CLAUDE_CODE:END -->
