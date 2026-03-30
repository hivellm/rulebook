# Proposal: Integrate Ralph Autonomous Loop with Rulebook

## Why

Currently, rulebook generates templates and validates projects, but it cannot autonomously implement features across multiple AI iterations. Ralph (https://github.com/snarktank/ralph) demonstrates a proven pattern for autonomous AI agent loops: breaking requirements into tasks, executing them with fresh AI context per iteration, persisting memory through git and structured files, and repeating until completion.

By integrating Ralph into rulebook, we can provide a complete autonomous development pipeline: detect project structure → generate task specifications → autonomously implement via repeated AI iterations → validate quality → commit progress. This transforms rulebook from a template/validation tool into a full autonomous coding system.

## What Changes

### 0. Ralph Skill Installation
- **ADDED** `templates/skills/workflows/ralph/SKILL.md` — Complete skill documentation for Ralph Autonomous Loop
- **ADDED** `templates/skills/workflows/ralph/manifest.json` — Skill manifest with commands, MCP tools, configuration schema
- **ADDED** `templates/skills/workflows/ralph/install.sh` — Installation script that:
  - Enables Ralph in .rulebook configuration
  - Creates .rulebook-ralph directory structure
  - Generates PRD from existing tasks
  - Updates .cursorrules with Ralph integration

### 1. Ralph Core Integration
- **ADDED** `src/core/ralph-manager.ts` — Orchestrates autonomous iteration loop: picks incomplete tasks, executes AI agent, validates quality, commits progress, updates task status, repeats
- **ADDED** `src/core/prd-generator.ts` — Converts rulebook task specifications into Ralph-compatible PRD JSON format with task hierarchy, priorities, and acceptance criteria
- **ADDED** `src/core/iteration-tracker.ts` — Tracks iteration history, learning notes, failures, and quality metrics across autonomous runs
- **ADDED** `src/types.ts` extensions — Add RalphConfig, IterationResult, PRDTask types

### 2. CLI Commands
- **ADDED** `rulebook ralph init` — Initialize Ralph configuration and create PRD from current tasks
- **ADDED** `rulebook ralph run [--max-iterations N] [--tool claude|amp]` — Execute autonomous loop
- **ADDED** `rulebook ralph status` — Show loop progress, completed tasks, current iteration
- **ADDED** `rulebook ralph history` — Display iteration history and learnings
- **ADDED** `rulebook ralph pause` — Gracefully pause autonomous loop
- **ADDED** `rulebook ralph resume` — Resume from paused state

### 3. MCP Server Tools
- **ADDED** `rulebook_ralph_init` — Initialize Ralph via MCP
- **ADDED** `rulebook_ralph_run` — Start autonomous loop via MCP
- **ADDED** `rulebook_ralph_status` — Query loop status via MCP
- **ADDED** `rulebook_ralph_get_iteration_history` — Retrieve iteration history via MCP

### 4. Ralph Files and Configuration
- **ADDED** `.rulebook-ralph/` directory structure:
  - `prd.json` — Task specifications converted to PRD format
  - `progress.txt` — Append-only learning log across iterations
  - `history/` — Per-iteration metadata and results
- **MODIFIED** `.rulebook` — Add ralph configuration: enabled, maxIterations, tool (claude|amp), maxContextLoss tolerance
- **ADDED** `templates/core/RALPH.md` — Documentation for Ralph integration and autonomous loop patterns

### 5. Agent Integration
- **MODIFIED** `src/core/agent-manager.ts` — Add Ralph-specific execution mode: execute with full PRD context, capture iteration output, extract completion status
- **ADDED** `src/agents/ralph-parser.ts` — Parse AI agent output to extract task completion status, learnings, errors, and quality metrics

### 6. Task Status Workflow
- **MODIFIED** Task schema — Add "in_iteration" status for tasks currently being implemented
- Existing statuses: pending → in_iteration → completed/blocked → archived
- Ralph loop automatically updates task status based on implementation results and quality checks

## Impact

- **Affected specs**:
  - `specs/cli/spec.md` (5 new Ralph commands)
  - `specs/mcp/spec.md` (4 new Ralph MCP tools)
  - `specs/core/spec.md` (new Ralph autonomous execution requirements)

- **Affected code**:
  - `templates/skills/workflows/ralph/` (new skill package)
  - `src/core/ralph-manager.ts` (new)
  - `src/core/prd-generator.ts` (new)
  - `src/core/iteration-tracker.ts` (new)
  - `src/agents/ralph-parser.ts` (new)
  - `src/core/agent-manager.ts` (modify execution mode)
  - `src/types.ts` (add Ralph types)
  - `src/cli/commands.ts` (add ralph subcommand)
  - `src/mcp/rulebook-server.ts` (add 4 MCP tools)
  - `.rulebook` schema (add ralph config)
  - `templates/core/RALPH.md` (new template)
  - `src/core/skills-manager.ts` (register Ralph skill)

- **Breaking change**: NO (Ralph is opt-in, disabled by default in `.rulebook`)

- **User benefit**:
  - **Autonomous development** — Tasks are automatically implemented via repeated AI iterations
  - **Quality gates** — Each iteration runs type-check, lint, and tests before committing
  - **Context persistence** — git history, PRD, and progress files maintain continuity between iterations
  - **Flexible tooling** — Works with Claude Code, Cursor (via Amp), or Gemini
  - **Learning loop** — AI builds knowledge across iterations by reading progress.txt and recent commits
  - **Pause/resume** — Stop autonomous loop gracefully and resume later with full history preserved
