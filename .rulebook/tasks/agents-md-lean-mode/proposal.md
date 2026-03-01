# Proposal: AGENTS.md Standard Lean Mode

## Context

The AGENTS.md standard (adopted by 60k+ projects) has two distinct usage patterns:

1. **Full mode** (current rulebook default): Comprehensive directives, all rules inline
2. **Lean mode** (standard compliance): AGENTS.md is a lightweight index that references external spec files

The lean mode pattern is:
```markdown
# Project Agent Directives

See detailed specs:
- [TypeScript Rules](/.rulebook/specs/TYPESCRIPT.md)
- [Quality Gates](/.rulebook/specs/QUALITY_ENFORCEMENT.md)
- [Git Workflow](/.rulebook/specs/GIT.md)
```

Benefits:
- AGENTS.md stays under 2KB (instead of 100KB+)
- AI agents load spec files only when relevant
- Better context window efficiency
- Compliant with emerging AGENTS.md standard

## Solution

Add `--lean` flag to `rulebook init` and `rulebook update`:
- Generates a 2KB AGENTS.md index
- All rules in `.rulebook/specs/` (unchanged)
- Add `mode: "lean" | "full"` to rulebook.json

Also add `lean` as the default for new projects (breaking change — document in CHANGELOG).

## Files to Modify

- `src/core/generator.ts` — `generateAgentsMd()` lean mode branch
- `src/cli/commands.ts` — `--lean` flag for init/update
- `src/core/config-manager.ts` — `mode: "lean" | "full"` config
- `src/types.ts` — add mode to ProjectConfig
- `templates/core/AGENTS_LEAN.md` — lean mode template
- `tests/generator-lean.test.ts` — new test file
