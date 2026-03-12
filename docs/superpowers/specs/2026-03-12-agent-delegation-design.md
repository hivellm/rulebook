# Agent Delegation & Cost Optimization

**Date**: 2026-03-12
**Status**: Approved

## Problem

Rulebook generates agent definitions but:
1. No `model:` field — all agents run on the most expensive model
2. Only 4 generic agents — missing docs, build, security, review specialists
3. Agents are hardcoded for TypeScript — not adapted to detected language
4. No delegation guidance — LLMs do everything in the main conversation

## Solution

### 1. Add `model:` to agent frontmatter

Existing agents get cost-appropriate model assignments:

| Agent | Model | Rationale |
|-------|-------|-----------|
| team-lead | opus | Complex coordination |
| implementer | sonnet | Follows established patterns |
| researcher | haiku | Read-only exploration |
| tester | sonnet | Writes code but follows patterns |

### 2. Create 4 new agent templates

| Agent | Model | Role |
|-------|-------|------|
| docs-writer | haiku | Documentation, README, changelogs |
| build-engineer | sonnet | Build, CI, dependency issues |
| security-reviewer | haiku | Audit, OWASP, vulnerabilities |
| code-reviewer | sonnet | Deep code review |

### 3. Template placeholders

Each agent template uses placeholders substituted at generation time:

- `{{language}}` — primary detected language (e.g., "TypeScript", "Rust")
- `{{framework}}` — primary framework if any (e.g., "Next.js", "Express")
- `{{test_framework}}` — detected test framework (e.g., "vitest", "pytest")
- `{{file_naming}}` — file naming convention (e.g., "kebab-case")

Substitution happens in `generator.ts` when copying agents to `.claude/agents/`.

### 4. Delegation section in AGENTS.md

`generator.ts` injects after language rules:

```markdown
## Agent Delegation Rules

The main conversation is for coordination only. Delegate all work to specialist agents:

| Task | Agent | Model | When to use |
|------|-------|-------|-------------|
| Implementation | implementer | sonnet | Writing new code or modifying existing |
| Research | researcher | haiku | Exploring codebase, finding patterns |
| Testing | tester | sonnet | Writing/running tests |
| Documentation | docs-writer | haiku | README, docs, changelogs |
| Build/CI | build-engineer | sonnet | Build failures, CI, dependencies |
| Security | security-reviewer | haiku | Dependency audit, vulnerability review |
| Code Review | code-reviewer | sonnet | Reviewing implementations |
| Orchestration | team-lead | opus | Multi-agent coordination |

### Delegation Rules

1. Never write code directly in the main conversation — delegate to the appropriate agent
2. After implementing code, launch tester + docs-writer in parallel
3. The main conversation serves ONLY for planning, coordination, and user communication
4. Use haiku agents (researcher, docs-writer, security-reviewer) for read-only tasks — they are 20x cheaper
5. Launch independent agents in parallel when possible
```

### 5. Changes to existing code

**generator.ts**:
- New function `generateDelegationSection(detection)` that builds the delegation table
- New function `substituteAgentPlaceholders(template, detection)` for placeholder replacement
- Called from `generateAgentsContent()` after language/framework sections

**claude-mcp.ts**:
- `installAgentDefinitions()` already copies `templates/agents/*.md` — no changes needed, new agents are picked up automatically

### 6. Testing

- `tests/agent-delegation.test.ts`:
  - Test delegation section generation with various detection results
  - Test placeholder substitution for multiple languages
  - Test all 8 agent templates have valid frontmatter with `model:` field
  - Test that delegation section adapts to detected tools

## Files Changed

- `templates/agents/team-lead.md` — add `model: opus`
- `templates/agents/implementer.md` — add `model: sonnet`, add placeholders
- `templates/agents/researcher.md` — add `model: haiku`, add placeholders
- `templates/agents/tester.md` — add `model: sonnet`, add placeholders
- `templates/agents/docs-writer.md` — NEW
- `templates/agents/build-engineer.md` — NEW
- `templates/agents/security-reviewer.md` — NEW
- `templates/agents/code-reviewer.md` — NEW
- `src/core/generator.ts` — add delegation section + placeholder substitution
- `tests/agent-delegation.test.ts` — NEW
