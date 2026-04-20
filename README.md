# @hivehub/rulebook

[![npm version](https://img.shields.io/npm/v/@hivehub/rulebook?logo=npm&logoColor=white)](https://www.npmjs.com/package/@hivehub/rulebook)
[![npm downloads](https://img.shields.io/npm/dm/@hivehub/rulebook?logo=npm&logoColor=white)](https://www.npmjs.com/package/@hivehub/rulebook)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[![Tests](https://img.shields.io/github/actions/workflow/status/hivellm/rulebook/test.yml?label=tests&logo=github)](https://github.com/hivellm/rulebook/actions/workflows/test.yml)
[![Build](https://img.shields.io/github/actions/workflow/status/hivellm/rulebook/build.yml?label=build&logo=github)](https://github.com/hivellm/rulebook/actions/workflows/build.yml)
[![Lint](https://img.shields.io/github/actions/workflow/status/hivellm/rulebook/lint.yml?label=lint&logo=github)](https://github.com/hivellm/rulebook/actions/workflows/lint.yml)

> Tool-agnostic AI development framework. Standardize projects across Claude Code, Cursor, Gemini, Codex, Windsurf, and Copilot with automated templates, quality gates, persistent memory, and framework detection for 28 languages, 17 frameworks, 13 MCP modules, and 20 services.

---

## Quick Start

```bash
# Initialize — auto-detects languages, tools, and complexity
npx @hivehub/rulebook@latest init

# Update existing project to latest rules
npx @hivehub/rulebook@latest update

# Check project health
npx @hivehub/rulebook@latest doctor
```

That's it. Rulebook detects your stack, generates rules for every AI tool in your project, sets up quality gates, and configures MCP integration — all in one command.

> Install globally with `npm install -g @hivehub/rulebook` to use `rulebook` directly.

---

## What Rulebook Does

AI coding assistants produce inconsistent, error-prone code without clear guidelines. Rulebook gives every AI tool in your project the same set of rules — automatically.

**One `init`, every tool configured:**

| What | How |
|------|-----|
| **Rules for every AI tool** | `AGENTS.md` + `CLAUDE.md` + `.cursor/rules/` + Gemini/Copilot/Windsurf configs — all generated from a single source of truth |
| **Quality gates** | Pre-commit hooks (lint, type-check, format) + pre-push hooks (build, tests) — language-aware, cross-platform |
| **44+ MCP tools** | Task management, persistent memory, skills, decisions, knowledge, learnings, Ralph loop, workspace, terse compression + evals — all via Model Context Protocol |
| **Structural enforcement** | `PreToolUse` hooks block forbidden patterns (deferred tasks, stubs/TODOs, manual task files) before edits reach disk |
| **Session continuity** | Persistent memory across sessions, automatic handoff at context limits, STATE.md live status |
| **Autonomous task solving** | Ralph loop: multi-iteration AI agent with quality gates, learning extraction, pause/resume |
| **28 languages, 17 frameworks** | Auto-detected with confidence scores, language-specific templates and CI/CD workflows |

---

## Core Features

### Modular Rule System

Rulebook generates a **modular `@import` chain** instead of one massive file:

```
CLAUDE.md (thin, ~100 lines)
  @imports AGENTS.md          — team-shared rules
  @imports AGENTS.override.md — your project overrides (survives updates)
  @imports .rulebook/STATE.md — live task/health status
  @imports .rulebook/PLANS.md — session scratchpad
```

Path-scoped rules in `.claude/rules/` load only when the AI touches matching files (e.g., TypeScript rules load only for `.ts` files). 5 always-on rules enforce core behaviors: diagnostic-first, fail-twice-escalate, no-deferred, no-shortcuts, sequential-editing.

### Persistent Memory

Context that survives across AI sessions. Decisions, bugs, patterns, and preferences are stored locally and searchable.

| Component | Technology |
|-----------|-----------|
| Storage | better-sqlite3 (native) with sql.js WASM fallback |
| Search | Hybrid BM25 keyword + HNSW vector (256-dim TF-IDF, no API calls) |
| Ranking | Reciprocal Rank Fusion |
| Privacy | Auto-redact `<private>` tags, local-only storage |

```bash
rulebook memory search "authentication approach"   # Hybrid search
rulebook memory save "Chose JWT over sessions"     # Save context
rulebook memory stats                               # DB health
```

### Terse Mode — Output & Input Compression (v5.4.0)

Structurally-enforced output compression via a SessionStart hook that injects a filtered SKILL.md and a per-turn UserPromptSubmit attention anchor. Four intensity levels aligned with Rulebook's agent tiers — `off` for opus-class reasoning, `brief` for sonnet, `terse` for haiku, `ultra` for CI/automation. Auto-clarity drops compression for security warnings, destructive ops, and quality-gate failures.

```bash
/rulebook-terse              # Activate using tier default
/rulebook-terse ultra        # Maximum compression
/rulebook-terse off          # Disable
```

Paired with `rulebook compress` — input-side compression for memory files (`CLAUDE.md`, `AGENTS.override.md`, `.rulebook/PLANS.md`):

```bash
rulebook compress --check CLAUDE.md          # Report ratio + validator
rulebook compress --dry-run CLAUDE.md        # Preview
rulebook compress CLAUDE.md                  # Rewrite + backup
rulebook compress --restore CLAUDE.md        # Revert from backup
```

Preserves code blocks, URLs, file paths, dates, and version numbers byte-for-byte.

**Measured** against a three-arm eval harness (`baseline` / `terse` / `rulebook-terse`) on 10 real prompts executed through the Claude Code CLI, tokens counted with `tiktoken`:

| Arm | Total tokens | vs baseline | vs terse |
|---|---:|---:|---:|
| `baseline` (no system prompt) | 2,696 | — | −42% |
| `terse` (control: `Answer concisely.`) | 4,611 | +71% | — |
| `rulebook-terse` (skill active) | **1,940** | **−28%** | **−58%** |

Honest delta is **`rulebook-terse` vs `terse` = 57.9% average lift**, per-prompt range **34% → 77%**. All ten prompts clear the 15% threshold individually. Interestingly, the `terse` control is 71% *larger* than `baseline` — `Answer concisely.` alone steers the model toward structured output (headings, code blocks), which inflates tokens. The skill's explicit rules reverse that effect.

Regenerate snapshots against live Claude: `npx tsx evals/cli_run.ts` (shells out to `claude -p`, reuses existing CLI auth). Re-measure offline: `npx tsx evals/measure.ts`.

Auto-activates after `rulebook init` or `rulebook update` — SessionStart hook writes to `.rulebook/.terse-mode`, UserPromptSubmit hook emits a ~45-token attention anchor per user message. Opt-out: set `.rulebook/rulebook.json` → `"terse": {"enabled": false}`. Override level: `"terse": {"defaultMode": "brief"}` or export `RULEBOOK_TERSE_MODE=ultra`.

See [docs/analysis/caveman/](docs/analysis/caveman/) for the design rationale, [docs/guides/rulebook-terse.md](docs/guides/rulebook-terse.md) for the user guide, and `templates/hooks/terse-*.sh` for the hook source.

### Task Management

Spec-driven development with OpenSpec-compatible format. Phase-prefixed task IDs, mandatory tail items (docs + tests + verify), and automatic archival.

```bash
rulebook task create phase1_add-auth    # Create task with structure
rulebook task list                       # See pending work
rulebook task validate phase1_add-auth  # Check format
rulebook task archive phase1_add-auth   # Archive when done
```

Each task gets: `proposal.md` (why), `tasks.md` (checklist), `specs/` (technical requirements with SHALL/MUST keywords and Given/When/Then scenarios).

### Ralph Autonomous Loop

Multi-iteration AI agent that solves tasks from a PRD with fresh context per iteration. 5 quality gates (type-check, lint, tests, coverage, security) must pass before an iteration succeeds.

```bash
rulebook ralph init                     # Generate PRD from tasks
rulebook ralph run --max-iterations 10  # Execute loop
rulebook ralph status                   # Check progress
rulebook ralph history                  # Review iterations
```

Features: parallel story execution, plan checkpoints, context compression, learning extraction, graceful pause/resume.

### Multi-Project Workspace

One MCP server manages all projects in a monorepo, with fully isolated per-project managers.

```bash
rulebook workspace init                 # Create workspace config
rulebook workspace add ./frontend       # Add projects
rulebook mcp init --workspace           # Single MCP for all
```

Auto-discovers from `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`, or `*.code-workspace`.

### Structural Enforcement Hooks

3 `PreToolUse` hooks block forbidden patterns at the tool level — before edits reach disk:

| Hook | Blocks |
|------|--------|
| `enforce-no-deferred` | `deferred`, `skip`, `later`, `TODO` in tasks.md |
| `enforce-no-shortcuts` | Stubs, placeholders, `HACK`/`FIXME` in source files |
| `enforce-mcp-for-tasks` | Manual `mkdir`/`Write` in `.rulebook/tasks/` |

Cross-platform (Node.js, no `jq` dependency).

---

## MCP Server

44+ MCP tools exposed via stdio transport. Zero configuration after `rulebook mcp init`.

```bash
rulebook mcp init    # One-time setup — configures .mcp.json automatically
```

| Category | Tools | Examples |
|----------|-------|---------|
| Tasks (7) | CRUD + validate + archive + delete | `rulebook_task_create`, `rulebook_task_list` |
| Skills (6) | List, show, enable, disable, search, validate | `rulebook_skill_enable`, `rulebook_skill_search` |
| Memory (6) | Save, search, get, timeline, stats, cleanup | `rulebook_memory_search`, `rulebook_memory_save` |
| Ralph (4) | Init, run, status, history | `rulebook_ralph_run`, `rulebook_ralph_status` |
| Workspace (4) | List, status, search, tasks | `rulebook_workspace_search`, `rulebook_workspace_tasks` |
| Knowledge (3) | Add, list, show | `rulebook_knowledge_add`, `rulebook_knowledge_list` |
| Decisions (4) | Create, list, show, update | `rulebook_decision_create`, `rulebook_decision_list` |
| Learnings (3) | Capture, list, promote | `rulebook_learn_capture`, `rulebook_learn_list` |
| Analysis (3) | Create, list, show | `rulebook_analysis_create`, `rulebook_analysis_list` |
| Compress (2) | Compress memory files, list candidates | `rulebook_compress`, `rulebook_compress_list` |
| Evals (2) | Offline measurement, live API regeneration | `rulebook_evals_measure`, `rulebook_evals_run` |
| Other (3+) | Doctor, rules list, blockers, session, codebase | `rulebook_doctor_run`, `rulebook_rules_list` |

All tools accept optional `projectId` for workspace routing.

---

## CLI Reference

### Project Setup

```bash
rulebook init                    # Interactive setup (auto-detects everything)
rulebook init --minimal          # Essentials only
rulebook init --lean             # AGENTS.md as <3KB index
rulebook init --light            # No quality enforcement
rulebook update                  # Update to latest rules
rulebook doctor                  # 7 health checks
rulebook validate                # Check project standards
rulebook health                  # Health score (0-100)
rulebook fix                     # Auto-fix common issues
```

### Task Management

```bash
rulebook task create <task-id>   # Create (phase-prefixed: phase1_add-auth)
rulebook task list               # List active tasks
rulebook task show <task-id>     # Show details
rulebook task validate <task-id> # Validate format
rulebook task archive <task-id>  # Archive completed task
rulebook task delete <task-id>   # Delete permanently
```

### Memory & Knowledge

```bash
rulebook memory search <query>   # Hybrid BM25+vector search
rulebook memory save <text>      # Save context
rulebook memory stats            # Database health
rulebook memory cleanup          # Evict old memories
rulebook knowledge list          # View patterns and anti-patterns
rulebook learn list              # View captured learnings
rulebook decision list           # View architecture decisions
```

### Ralph Autonomous Loop

```bash
rulebook ralph init              # Generate PRD from tasks
rulebook ralph run               # Execute iteration loop
rulebook ralph status            # Current progress
rulebook ralph history           # Past iterations
rulebook ralph pause             # Gracefully pause
rulebook ralph resume            # Resume from pause
```

### Workspace

```bash
rulebook workspace init          # Create workspace config
rulebook workspace add <path>    # Add project
rulebook workspace list          # List all projects
rulebook workspace status        # Status with task counts
```

### Rules & Skills

```bash
rulebook rules list              # List rules by tier
rulebook rules add <rule>        # Install from library
rulebook rules project           # Project to all tools
rulebook skill list              # List available skills
rulebook skill add <skill-id>    # Enable a skill
rulebook skill show <skill-id>   # Show skill details
```

### CI/CD & Quality

```bash
rulebook workflows               # Generate GitHub Actions
rulebook check-deps              # Check dependencies
rulebook check-coverage          # Check test coverage
rulebook version <major|minor|patch>  # Bump version
rulebook changelog               # Generate from git commits
```

---

## Supported Stack

**28 Languages**: TypeScript, JavaScript, Python, Rust, Go, Java, Kotlin, C, C++, C#, PHP, Ruby, Swift, Elixir, Dart, Scala, Haskell, Julia, R, Lua, Solidity, Zig, Erlang, Ada, SAS, Lisp, Objective-C, SQL

**17 Frameworks**: NestJS, Spring Boot, Laravel, Django, Flask, Rails, Symfony, Zend, Angular, React, Vue, Nuxt, Next.js, jQuery, React Native, Flutter, Electron

**20 Services**: PostgreSQL, MySQL, MariaDB, SQL Server, Oracle, SQLite, MongoDB, Cassandra, DynamoDB, Redis, Memcached, Elasticsearch, Neo4j, InfluxDB, RabbitMQ, Kafka, S3, Azure Blob, GCS, MinIO

**13 MCP Modules**: Vectorizer, Synap, Context7, GitHub MCP, Playwright, Memory, Supabase, Notion, Atlassian, Serena, Figma, Grafana, Sequential Thinking

**23 AI Tools**: Cursor, Windsurf, VS Code, GitHub Copilot, Tabnine, Replit, JetBrains AI, Zed, Aider, Continue, Claude, Claude Code, Gemini, Cline, Amazon Q, Auggie, CodeBuddy, Factory, OpenCode, Kilo, Codex, Codeium, Cursor CLI

---

## VSCode Extension

The **Rulebook Dashboard** extension provides full visibility into your AI workflow.

```bash
code --install-extension vscode-extension/rulebook-dashboard-*.vsix
```

| Tab | Shows |
|-----|-------|
| Agents | Team members with real-time status, memory state, last activity |
| Tasks | Progress bars, expandable details, Archive & Update buttons |
| Memory | Stats (count, DB size, types), full-text search |
| Analysis | Structured analyses with findings and execution plans |
| Doctor | 7 health checks with auto-run |
| Telemetry | MCP tool latency and success rates |

Status bar: context usage indicator (`ctx 78%` with green/yellow/red), Rulebook button, indexer state.

---

## Configuration

All config lives in `.rulebook/rulebook.json`:

```json
{
  "version": "5.3.0",
  "mode": "full",
  "features": {
    "mcp": true,
    "memory": true,
    "ralph": true,
    "multiAgent": true,
    "hooks": true,
    "telemetry": false
  }
}
```

**Key files generated by Rulebook:**

| File | Purpose |
|------|---------|
| `AGENTS.md` | Team-shared AI rules (regenerated on update) |
| `AGENTS.override.md` | Your project overrides (survives updates) |
| `CLAUDE.md` | Claude Code entry point with @imports |
| `.claude/rules/` | Path-scoped rules (language-specific + always-on) |
| `.claude/settings.json` | Hooks and env vars for Claude Code |
| `.rulebook/specs/` | Detailed spec templates per language/framework |
| `.rulebook/STATE.md` | Machine-written live status |
| `.rulebook/tasks/` | Active task directories |

---

## Documentation

Full documentation in [`/docs`](docs/):

- [Getting Started](docs/guides/GETTING_STARTED.md)
- [Best Practices](docs/guides/BEST_PRACTICES.md)
- [CLI Agents](docs/CLI_AGENTS.md)
- [Roadmap](docs/ROADMAP.md)

See the full [CHANGELOG](CHANGELOG.md) for version history.

---

## Contributing

Contributions welcome! Requires Node.js 20+.

```bash
git clone https://github.com/hivellm/rulebook.git
cd rulebook
npm install
npm test
npm run build
```

---

## Acknowledgments

- **[Ralph](https://github.com/snarktank/ralph)** — Inspired the autonomous loop integration (multi-iteration AI task solving with fresh context per iteration)
- **[OpenSpec](https://github.com/Fission-AI/openspec)** — Influenced the task management format (delta-based specs, Given/When/Then scenarios, requirement-focused organization)

---

## License

Apache License 2.0 &copy; HiveLLM Team

[Issues](https://github.com/hivellm/rulebook/issues) &middot; [Discussions](https://github.com/hivellm/rulebook/discussions) &middot; [npm](https://www.npmjs.com/package/@hivehub/rulebook)
