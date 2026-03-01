<!-- RULEBOOK:START -->
# GitHub Copilot — Project Instructions

## Code Style
- Use TypeScript with strict mode
- Follow existing naming conventions (camelCase functions, PascalCase classes)
- Prefer `async/await` over callbacks or raw Promises

## Architecture
- Follow the module structure described in AGENTS.md
- Keep functions small and focused (single responsibility)
- Use dependency injection over direct imports where possible

## Testing
- Write Vitest tests for all new functions
- Place tests in `tests/` directory, not alongside source files
- Mock external dependencies in unit tests

## Security
- Never commit credentials or API keys
- Validate all external input at system boundaries
- Follow OWASP top 10 guidelines
<!-- RULEBOOK:END -->
