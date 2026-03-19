# Spec: Adaptive Agent Framework

## Overview

The agent framework generates specialized agent definitions adapted per tool, with graceful degradation for tools that don't support custom agents.

## ADDED Requirements

### Requirement: Agent Template Format

Agent templates SHALL be stored in `templates/agents/<project-type>/<agent-name>.md` with frontmatter:

```yaml
---
name: shader-engineer
domain: shaders
filePatterns: ["*.hlsl", "*.glsl", "*.msl", "*.wgsl"]
tier: core           # core (most capable model), standard (mid-tier), research (cheapest)
checklist:           # pre-flight questions agent must answer before returning code
  - "Which reference source file was this based on?"
  - "Are ALL parameters from the reference present?"
---
```

### Requirement: Claude Code Agent Generation

#### Scenario: Generate full agent definition
Given a project with Claude Code detected and `agentFramework.projectType: "game-engine"`
When running `rulebook init` or `rulebook update`
Then it SHALL generate `.claude/agents/<name>.md` for each agent in the game-engine template library
And each agent SHALL include the domain expertise description from the template
And each agent SHALL include Tier 1 prohibitions (mandatory section injection)
And each agent SHALL include "Update tasks.md after completion" rule
And each agent SHALL include memory directory setup instructions

#### Scenario: Generate agent memory directories
Given agent generation for Claude Code
When an agent has `tier: core` or `tier: standard`
Then it SHALL create `.claude/agent-memory/<name>/MEMORY.md` with an empty index template

### Requirement: Cursor Graceful Degradation

#### Scenario: Convert agents to contextual rules
Given a project with Cursor detected but NOT Claude Code
When generating agent equivalents
Then it SHALL generate `.cursor/rules/<domain>.mdc` for each agent
And the `.mdc` file SHALL have `globs` matching the agent's `filePatterns`
And the rule content SHALL include the agent's expertise, checklist, and Tier 1 prohibitions
And it SHALL NOT reference Claude-specific features (SendMessage, Teams, agent-memory)

### Requirement: Gemini/Codex Graceful Degradation

#### Scenario: Convert agents to inline sections
Given a project with Gemini or Codex detected but NOT Claude Code
When generating agent equivalents
Then it SHALL generate conditional sections in the directives file (GEMINI.md or AGENTS.md)
And each section SHALL be headed "## When Editing <filePatterns>"
And section content SHALL include expertise + checklist + Tier 1 prohibitions

### Requirement: Model Tier Assignment

Model tiers SHALL use tool-agnostic labels that map to specific models per tool:

| Label | Claude | Gemini | OpenAI | Description |
|-------|--------|--------|--------|-------------|
| `core` | opus | Pro | o3/o4-mini | Complex bugs, architecture, domain-critical code |
| `standard` | sonnet | Flash | 4o | Standard implementation, tests, medium complexity |
| `research` | haiku | Flash-Lite | 4o-mini | Read-only research, docs, exploration |

#### Scenario: Assign model tier in Claude Code agent
Given an agent template with `tier: core`
When generating a Claude Code agent definition
Then the `model` frontmatter field SHALL be set to `opus`

#### Scenario: Document model tier for non-Claude tools
Given an agent template with `tier: core` and Cursor detected
When generating a Cursor contextual rule
Then it SHALL include a comment: `<!-- Recommended: use most capable model for this domain -->`

### Requirement: Mandatory Section Injection

Every generated agent definition or contextual rule SHALL include:
1. Tier 1 prohibitions (no stubs, no TODOs, no placeholders)
2. "Update tasks.md after every completion"
3. "Never mark tasks as deferred — implement or explain"
4. "Research before implementing — never guess"
5. Token optimization rules appropriate for the agent's model tier
