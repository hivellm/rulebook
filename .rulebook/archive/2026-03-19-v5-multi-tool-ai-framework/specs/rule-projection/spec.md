# Spec: Rule Projection Engine

## Overview

The rule projection engine reads canonical rules from `.rulebook/rules/` and generates tool-specific rule files for each detected AI tool.

## ADDED Requirements

### Requirement: Canonical Rule Format

Rules SHALL be stored in `.rulebook/rules/<name>.md` with YAML frontmatter:

```yaml
---
name: no-shortcuts
tier: 1                    # 1=absolute prohibition, 2=mandatory workflow, 3=standard
description: "Never use stubs, TODOs, placeholders, or approximations"
alwaysApply: true          # true=always active, false=conditional
filePatterns: ["*"]        # glob patterns for conditional activation
tools: ["all"]             # "all" or ["claude-code", "cursor", "gemini", ...]
---
```

#### Scenario: Parse canonical rule
Given a rule file `.rulebook/rules/no-shortcuts.md` with valid frontmatter
When the projection engine reads the file
Then it SHALL extract name, tier, description, alwaysApply, filePatterns, and tools fields
And it SHALL parse the markdown body as the rule content

### Requirement: Claude Code Projection

The engine SHALL project canonical rules to `.claude/rules/<name>.md`.

#### Scenario: Generate Claude Code rule
Given a canonical rule with `tools: ["all"]` or `tools: ["claude-code"]`
When projecting to Claude Code format
Then it SHALL write `.claude/rules/<name>.md` with the rule content verbatim
And it SHALL NOT add YAML frontmatter (Claude Code rules are plain markdown)

### Requirement: Cursor Projection

The engine SHALL project canonical rules to `.cursor/rules/<name>.mdc` with Cursor-compatible frontmatter.

#### Scenario: Generate Cursor rule with alwaysApply
Given a canonical rule with `alwaysApply: true`
When projecting to Cursor format
Then it SHALL write `.cursor/rules/<name>.mdc` with frontmatter:
```yaml
---
description: "<canonical description>"
alwaysApply: true
---
```

#### Scenario: Generate Cursor rule with file patterns
Given a canonical rule with `alwaysApply: false` and `filePatterns: ["*.cpp", "*.h"]`
When projecting to Cursor format
Then it SHALL write `.cursor/rules/<name>.mdc` with frontmatter:
```yaml
---
description: "<canonical description>"
globs: ["*.cpp", "*.h"]
---
```

### Requirement: Gemini Projection

The engine SHALL project canonical rules as sections in `GEMINI.md`.

#### Scenario: Generate Gemini sections
Given multiple canonical rules with `tools: ["all"]` or `tools: ["gemini"]`
When projecting to Gemini format
Then it SHALL generate or update `GEMINI.md` with each rule as a markdown section
And Tier 1 rules SHALL appear first under a "## Highest Precedence Rules" heading
And Tier 2 rules SHALL appear under "## Mandatory Workflow Rules"
And Tier 3 rules SHALL appear under "## Standards"

### Requirement: Copilot Projection

The engine SHALL project canonical rules as sections in `.github/copilot-instructions.md`.

#### Scenario: Generate Copilot sections
Given canonical rules targeting Copilot
When projecting to Copilot format
Then it SHALL generate or update `.github/copilot-instructions.md`
And it SHALL preserve any existing user content outside of rulebook-managed sections
And rulebook-managed sections SHALL be delimited with `<!-- RULEBOOK:START -->` / `<!-- RULEBOOK:END -->`

### Requirement: Windsurf Projection

The engine SHALL project canonical rules to `.windsurf/rules/<name>.md`.

#### Scenario: Generate Windsurf rule
Given a canonical rule targeting Windsurf
When projecting to Windsurf format
Then it SHALL write `.windsurf/rules/<name>.md` with the rule content

### Requirement: Idempotent Updates

#### Scenario: Re-run projection without changes
Given rules were previously projected
When running `rulebook update` with no rule changes
Then tool-specific files SHALL NOT be modified (preserve timestamps)

#### Scenario: Re-run projection with rule changes
Given a canonical rule was modified
When running `rulebook update`
Then ONLY the affected tool-specific files SHALL be updated
