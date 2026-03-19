# Proposal: v5-multi-tool-ai-framework

## Why

Rulebook v4 generates templates that work but are insufficient for large, complex codebases. Two real-world projects (UzEngine — game engine with 43 agents, and TML — programming language with 32 agents) had to manually create 17+ rule files, dozens of specialized agent definitions, and custom memory systems to bridge the gap between "generated AGENTS.md" and "production-ready AI workflow."

Additionally, v4 is heavily biased toward Claude Code. Users working with Cursor, Gemini CLI, Codex, Windsurf, Continue.dev, or Copilot get a fraction of the value. The core insight from cross-project analysis: **quality directives are universal; delivery must be tool-specific.**

Full analysis at `docs/analysis/` (7 reports, deep cross-project study).

## What Changes

### Architecture: 3-Layer Multi-Tool System

**Layer 1 — Universal Directives** (plain markdown, any LLM reads):
- New `TIER1_PROHIBITIONS.md` template: absolute prohibitions (no stubs/TODOs/placeholders, no destructive git, no delete without authorization, sequential editing, research-first)
- Structured `PLANS.md` with `<!-- PLANS:CONTEXT -->`, `<!-- PLANS:TASK -->`, `<!-- PLANS:HISTORY -->` sections
- Enhanced `GIT.md` with explicit allow-list (not just restrictions)
- Anti-deferred rule template
- Token optimization templates by model tier

**Layer 2 — Tool-Specific Generation** (one source, multiple projections):
- Canonical rules in `.rulebook/rules/` with frontmatter (tier, filePatterns, tools)
- `rulebook update` projects rules to each detected tool:
  - Claude Code → `.claude/agents/*.md` + `.claude/rules/*.md`
  - Cursor → `.cursor/rules/*.mdc` (with `alwaysApply`/`globs` frontmatter)
  - Gemini → `GEMINI.md` (inline conditional sections)
  - Codex → enriched `AGENTS.md`
  - Windsurf → `.windsurf/rules/*.md`
  - Copilot → `.github/copilot-instructions.md`
- Adaptive agent framework with graceful degradation:
  - Claude Code: full agent definitions with memory
  - Cursor: contextual rules simulating specialization (file-pattern activated)
  - Others: inline sections in directives file
- Agent template library by project type (game-engine, compiler, web-app, mobile)
- Model tier assignment with tool-agnostic labels (core/standard/research)

**Layer 3 — MCP Cross-Tool** (universal integration):
- New MCP tools: `rulebook_session_start`, `rulebook_session_end`, `rulebook_rules_list`, `rulebook_blockers`
- Task dependencies with `blocks`/`blockedBy`/`cascadeImpact` fields
- Blocker chain visualization via CLI and MCP

### New CLI Commands
- `rulebook init --tools claude-code,cursor,gemini` — multi-tool generation
- `rulebook update --tools cursor` — update specific tool configs
- `rulebook rules list` — list active rules by tier
- `rulebook rules add <name>` — add rule from template library
- `rulebook session start/end` — session context management
- `rulebook task blockers` — blocker chain visualization
- `rulebook assess` — project complexity detection with calibrated recommendations

### New Templates
- `templates/core/TIER1_PROHIBITIONS.md` — absolute prohibitions (S-tier directive)
- `templates/core/PLANS_STRUCTURED.md` — session scratchpad with sections
- `templates/core/NO_DEFERRED.md` — anti-deferred rule
- `templates/core/TOKEN_OPTIMIZATION.md` — model-tier output rules
- `templates/rules/no-shortcuts.md` — canonical rule format example
- `templates/rules/git-safety.md` — explicit allow-list
- `templates/rules/sequential-editing.md`
- `templates/rules/task-decomposition.md`
- `templates/rules/research-first.md`
- `templates/rules/incremental-tests.md`
- `templates/agents/game-engine/*.md` — game engine agent templates
- `templates/agents/compiler/*.md` — compiler/language agent templates
- `templates/agents/web-app/*.md` — web application agent templates

### Modified Core Files
- `src/core/generator.ts` — multi-tool generation, rule projection, tier system
- `src/core/detector.ts` — tool detection (Claude Code, Cursor, Gemini, etc.), complexity detection
- `src/core/config-manager.ts` — new config fields (agentFramework, referenceSource, rules)
- `src/core/task-manager.ts` — task dependencies, blocker chain, cascade impact
- `src/mcp/rulebook-server.ts` — new MCP tools (session, rules, blockers)
- `src/cli/commands.ts` — new CLI commands (rules, session, assess)
- `src/types.ts` — new types for rules, agents, complexity tiers

## Impact
- Affected specs: RULEBOOK.md, QUALITY_ENFORCEMENT.md, GIT.md, MULTI_AGENT.md, AGENT_AUTOMATION.md
- Affected code: generator, detector, config-manager, task-manager, MCP server, CLI commands
- Breaking change: NO (v4 configs continue to work; new features are additive)
- User benefit: Zero manual rule files needed. Works with any AI tool. One source, multiple projections. 3x faster project setup. Cross-tool memory via MCP + PLANS.md.
