# Spec: Tool Detection & Multi-Tool Generation

## Overview

The detector identifies which AI tools are in use for a project and generates appropriate configurations for each.

## ADDED Requirements

### Requirement: Tool Detection

The detector SHALL identify AI tools by checking for their configuration artifacts:

| Tool | Detection Indicators |
|------|---------------------|
| Claude Code | `.claude/` directory, `CLAUDE.md` file |
| Cursor | `.cursor/` directory, `.cursor/mcp.json`, `.cursor/rules/` |
| Gemini CLI | `GEMINI.md` file, `.gemini/` directory |
| Codex | `codex.json`, `.codex/` directory |
| Windsurf | `.windsurf/` directory, `.windsurf/rules/` |
| Continue.dev | `.continue/` directory, `.continue/config.yaml` |
| Copilot | `.github/copilot-instructions.md` |

#### Scenario: Detect Claude Code
Given a project with `.claude/` directory or `CLAUDE.md`
When running tool detection
Then it SHALL return `claude-code` in the detected tools list with confidence >= 0.8

#### Scenario: Detect multiple tools
Given a project with both `.claude/` and `.cursor/` directories
When running tool detection
Then it SHALL return both `claude-code` and `cursor` in the detected tools list

#### Scenario: No tools detected
Given a project with no AI tool indicators
When running tool detection
Then it SHALL return an empty tools list
And generation SHALL default to universal-only output (AGENTS.md + .rulebook/specs/)

### Requirement: --tools CLI Flag

#### Scenario: Explicit tool selection
Given `rulebook init --tools claude-code,cursor`
When generating configurations
Then it SHALL generate for Claude Code AND Cursor regardless of detection results
And it SHALL NOT generate for tools not in the list

#### Scenario: Init without --tools flag
Given `rulebook init` without --tools flag
When auto-detecting tools
Then it SHALL generate for all detected tools
And it SHALL ALWAYS generate universal files (AGENTS.md, .rulebook/specs/)

### Requirement: Project Complexity Detection

The detector SHALL assess project complexity for calibrated generation:

| Tier | LOC | Languages | Indicators |
|------|-----|-----------|-----------|
| Small | <10K | 1 | Few source directories |
| Medium | 10-50K | 1-2 | Multiple modules |
| Large | 50K+ | 2+ | Complex build system, multiple targets |
| Complex | 100K+ | 3+ | Custom MCP server, reference sources |

#### Scenario: Detect large project
Given a project with 80K LOC across C++ and HLSL
When running complexity detection
Then it SHALL return complexity tier "large"
And the recommended generation profile SHALL include Tier 1 + Tier 2 rules + specialized agents

#### Scenario: Detect small project
Given a project with 5K LOC in TypeScript
When running complexity detection
Then it SHALL return complexity tier "small"
And the recommended generation profile SHALL include Tier 1 rules only (no agents, no decomposition rules)

### Requirement: Multi-Tool Update

#### Scenario: Update all detected tools
Given a project with Claude Code and Cursor detected
When running `rulebook update`
Then it SHALL update universal files (AGENTS.md, .rulebook/specs/)
And it SHALL update Claude Code files (CLAUDE.md, .claude/rules/, .claude/agents/)
And it SHALL update Cursor files (.cursor/rules/*.mdc)

#### Scenario: Update specific tool
Given `rulebook update --tools cursor`
When updating
Then it SHALL ONLY update Cursor-specific files
And it SHALL NOT modify Claude Code, Gemini, or other tool files
