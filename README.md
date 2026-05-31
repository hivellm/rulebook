# @hivehub/rulebook

[![npm version](https://img.shields.io/npm/v/@hivehub/rulebook?logo=npm&logoColor=white)](https://www.npmjs.com/package/@hivehub/rulebook)
[![npm downloads](https://img.shields.io/npm/dm/@hivehub/rulebook?logo=npm&logoColor=white)](https://www.npmjs.com/package/@hivehub/rulebook)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[![Tests](https://img.shields.io/github/actions/workflow/status/hivellm/rulebook/test.yml?label=tests&logo=github)](https://github.com/hivellm/rulebook/actions/workflows/test.yml)
[![Build](https://img.shields.io/github/actions/workflow/status/hivellm/rulebook/build.yml?label=build&logo=github)](https://github.com/hivellm/rulebook/actions/workflows/build.yml)
[![Lint](https://img.shields.io/github/actions/workflow/status/hivellm/rulebook/lint.yml?label=lint&logo=github)](https://github.com/hivellm/rulebook/actions/workflows/lint.yml)

> Tool-agnostic AI development framework. Standardize projects across Claude Code, Cursor, Gemini, Codex, Windsurf, Copilot, and OpenCode with automated templates, quality gates, persistent memory, and language detection for 28 languages and 13 MCP modules.

---

## Quick Start

```bash
# Initialize — auto-detects languages, tools, and complexity
npx @hivehub/rulebook@latest init

# Update existing project to latest rules
npx @hivehub/rulebook@latest update

# Check project health
npx @hivehub/rulebook@latest doctor

# Apply the recommended Claude Code setup (MCP, agents, workflows, settings)
npx @hivehub/rulebook@latest claude
```

That's it. Rulebook detects your stack, generates rules for every AI tool in your project, sets up quality gates, and configures MCP integration — all in one command.

Then, inside Claude Code, spec a feature and let the backlog implement itself:

```
/spec rate-limit the public REST API   # asks questions, creates rulebook tasks
/rulebook-driver                        # implements every task, opus review gate
```

See [Usage Examples](docs/usage-examples.md) for the full set of end-to-end flows.

> Install globally with `npm install -g @hivehub/rulebook` to use `rulebook` directly.

---

## What Rulebook Does

AI coding assistants produce inconsistent, error-prone code without clear guidelines. Rulebook gives every AI tool in your project the same set of rules — automatically.

**One `init`, every tool configured:**

| What | How |
|------|-----|
| **Rules for every AI tool** | `AGENTS.md` + `CLAUDE.md` + `.cursor/rules/` + Gemini/Copilot/Windsurf configs — all generated from a single source of truth |
| **Quality gates** | Pre-commit hooks (lint, type-check, format) + pre-push hooks (build, tests) — language-aware, cross-platform |
| **MCP tools** | Task management, persistent memory, skills, decisions, knowledge, learnings, workspace, terse compression — all via Model Context Protocol |
| **Structural enforcement** | `PreToolUse` hooks block forbidden patterns (deferred tasks, stubs/TODOs, manual task files) before edits reach disk |
| **Session continuity** | Persistent memory across sessions, automatic handoff at context limits, STATE.md live status |
| **28 languages** | Auto-detected with confidence scores, language-specific templates and CI/CD workflows |

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
| Storage | Plain markdown files with YAML frontmatter (one file per memory) |
| Layout | `.rulebook/memory/{memories,sessions,codegraph}/<YYYY>/<MM>/...` |
| Search | BM25 over file content + frontmatter tag boost (lazy inverted-index sidecar above 1K entries) |
| Privacy | Auto-redact `<private>` tags, local-only storage |
| Migration | One-shot legacy SQLite → markdown via `rulebook memory migrate-from-db` |

```bash
rulebook memory search "authentication approach"   # BM25 search
rulebook memory save "Chose JWT over sessions"     # Save context
rulebook memory stats                               # File count + size
```

### Terse Mode — Output & Input Compression (v5.4.0)

Structurally-enforced output compression via a SessionStart hook that injects a filtered SKILL.md and a per-turn UserPromptSubmit attention anchor. Four intensity levels aligned with Rulebook's agent tiers — `off` for opus-class reasoning, `brief` for sonnet, `terse` for haiku, `ultra` for CI/automation. Auto-clarity drops compression for security warnings, destructive ops, and quality-gate failures.

```bash
/rulebook-terse              # Activate using tier default
/rulebook-terse ultra        # Maximum compression
/rulebook-terse off          # Disable
```

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

## Multi-Agent Workflows

`rulebook init`/`update` installs orchestrated [Claude Code Workflow](https://code.claude.com/docs/en/workflows) scripts into `.claude/workflows/`. Each fans work out across the bundled agents with cost-tiered models — `haiku` for read-only steps, `sonnet` for implementation, `opus` for the final review gate.

| Workflow | What it does | Args |
|----------|--------------|------|
| `rulebook-driver` | Loops the backlog: discover next unchecked task item → implement (SDD+TDD) → independent **opus** reviewer gate (≤3 rounds) → document → next, until drained / a item fails / cap / low budget | `{ once?, maxItems?, minBudget? }` |
| `spec-author` | Help author a task spec: research → draft proposal + SHALL/MUST spec → **opus** gap-critic returns ranked clarifying questions + gaps for you to answer (re-run with answers to iterate) | `{ topic, answers? }` |
| `feature-pipeline` | research → architect (opus) → implement → test → **opus** review → document | `{ feature }` |
| `bugfix` | root-cause → TDD fix → **opus** quality-gatekeeper verdict (≤2 rounds) | `{ bug }` |
| `review-fanout` | Adversarial multi-dimension review of the diff (correctness/security/perf/tests), each finding verified, **opus** synthesis | — |
| `release-gate` | Parallel build / tests+coverage / security / docs → single go/no-go | — |

The independent reviewers run as fresh subagents with **no developer context** — they see only the `git diff` plus the spec, so the gate is a genuine second opinion.

### Running a workflow

Invoke a workflow from Claude Code with the matching slash command. Some take arguments (a JSON object):

```
/rulebook-driver                              # drain the whole backlog
/rulebook-driver { "once": true }             # one item, then stop
/rulebook-driver { "maxItems": 5 }            # at most 5 items this run
/spec-author { "topic": "rate-limit the public API" }
/feature-pipeline { "feature": "add CSV export to the report page" }
/bugfix { "bug": "tasks.md checkbox state lost on archive" }
/review-fanout                                # reviews the current git diff
/release-gate                                 # go/no-go before a release
```

### `rulebook-driver` — the backlog loop

Discovers the first unchecked `- [ ]` item (lowest phase first, never reordered), then per item: implement (SDD+TDD) → independent **opus** review → on reject, loops back to the dev with the blocking issues (max 3 rounds) → document. It then moves to the next item and repeats until one of: backlog drained, an item fails review after 3 rounds (the loop halts — sequential tasks must not build on a broken item), `maxItems` reached (default 25), or the token budget runs low (`minBudget`, default 60k). Args: `{ once?, maxItems?, minBudget? }`.

### `spec-author` — interactive spec authoring

Because workflow subagents are **non-interactive**, `spec-author` cannot prompt you mid-run. Instead it researches the codebase, drafts a proposal + SHALL/MUST spec, then returns ranked clarifying **questions** and detected **gaps**. The loop:

1. `/spec-author { "topic": "..." }` → returns a draft + questions/gaps.
2. Answer the questions.
3. Re-run feeding the answers back: `/spec-author { "topic": "...", "answers": [{ "question": "...", "answer": "..." }] }`.
4. Repeat until it returns `ready: true` (no open questions). Then create the task with `rulebook task create` using the finalized spec.

### What the reviewers check

The `rulebook-driver`, `feature-pipeline`, and `bugfix` gates judge two axes and only pass when both hold: **SDD** — every SHALL/MUST scenario in the spec is satisfied and nothing unspecified was added; **TDD** — tests exist for the new behavior, were written for it, and actually run and pass. The reviewer runs the type-checker and the relevant tests itself rather than trusting the developer's report.

---

## Claude Code Setup

`rulebook claude` applies the recommended Claude Code setup in one idempotent, non-interactive step — useful to (re)apply the best configuration at any time without re-running `init`.

```bash
rulebook claude                 # apply the recommended setup
rulebook claude --model opus    # same, but set the default model to opus (default: sonnet)
```

It installs the MCP server entry, skills, agent definitions, and the workflows above, then layers an opinionated, cost-aware `.claude/settings.json`:

| Applied | Detail |
|---------|--------|
| Hooks | team enforcement, quality gates, session handoff, terse mode |
| Permissions allowlist | auto-approves safe read-only Bash (`ls`/`cat`/`grep`/`rg`/`find`/`git status\|diff\|log\|blame`/`npm run type-check`/`npm test`) + `mcp__rulebook` — fewer prompts, no loss of safety |
| `statusLine` | shows project dir + git branch |
| `model` | cost-aware default (`sonnet`; `opus` stays reserved for the workflow review gates) |

All settings are **additive and non-clobbering**: existing `permissions.allow` entries, a user-authored `statusLine`, and an explicit `model` are preserved. Restart Claude Code after running it to load the new configuration. Requires Claude Code installed (`~/.claude`); otherwise it no-ops with a notice.

---

## MCP Server

MCP tools exposed via stdio transport. Zero configuration after `rulebook mcp init`.

```bash
rulebook mcp init    # One-time setup — configures .mcp.json automatically
```

| Category | Tools | Examples |
|----------|-------|---------|
| Tasks | CRUD + validate + archive + delete | `rulebook_task_create`, `rulebook_task_list` |
| Skills | List, show, enable, disable, search, validate | `rulebook_skill_enable`, `rulebook_skill_search` |
| Memory | Save, search, get, timeline, stats, cleanup | `rulebook_memory_search`, `rulebook_memory_save` |
| Workspace | List, status, search, tasks | `rulebook_workspace_search`, `rulebook_workspace_tasks` |
| Knowledge | Add, list, show | `rulebook_knowledge_add`, `rulebook_knowledge_list` |
| Decisions | Create, list, show, update | `rulebook_decision_create`, `rulebook_decision_list` |
| Learnings | Capture, list, promote | `rulebook_learn_capture`, `rulebook_learn_list` |
| Other | Rules list, session, codebase | `rulebook_rules_list`, `rulebook_session_start` |

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
rulebook doctor                  # Health checks (file sizes, broken imports, stale state)
rulebook validate                # Check project standards
rulebook claude                  # Apply recommended Claude Code setup (MCP, agents, workflows, settings)
rulebook claude --model opus     # Same, overriding the default model (default: sonnet)
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
rulebook memory search <query>      # BM25 search over markdown corpus
rulebook memory save <text>         # Save context
rulebook memory stats               # File count + size
rulebook memory cleanup             # Age-based retention (--force = 1-day cutoff)
rulebook memory migrate-from-db     # One-shot legacy SQLite -> markdown
rulebook knowledge list             # View patterns and anti-patterns
rulebook learn list                 # View captured learnings
rulebook decision list              # View architecture decisions
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
```

---

## Supported Stack

**28 Languages**: TypeScript, JavaScript, Python, Rust, Go, Java, Kotlin, C, C++, C#, PHP, Ruby, Swift, Elixir, Dart, Scala, Haskell, Julia, R, Lua, Solidity, Zig, Erlang, Ada, SAS, Lisp, Objective-C, SQL

**13 MCP Modules**: Vectorizer, Synap, Context7, GitHub MCP, Playwright, Memory, Supabase, Notion, Atlassian, Serena, Figma, Grafana, Sequential Thinking

**23 AI Tools**: Cursor, Windsurf, VS Code, GitHub Copilot, Tabnine, Replit, JetBrains AI, Zed, Aider, Continue, Claude, Claude Code, Gemini, Cline, Amazon Q, Auggie, CodeBuddy, Factory, OpenCode (first-class with MCP + commands + agents + skills), Kilo, Codex, Codeium, Cursor CLI

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
| Memory | Stats (count, file size, types), full-text search |
| Doctor | Health checks with auto-run |

Status bar: context usage indicator (`ctx 78%` with green/yellow/red), Rulebook button, indexer state.

---

## Configuration

All config lives in `.rulebook/rulebook.json`:

```json
{
  "version": "5.6.0",
  "mode": "full",
  "features": {
    "mcp": true,
    "memory": true,
    "multiAgent": true,
    "hooks": true
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

- [Usage Examples](docs/usage-examples.md) — end-to-end flows for every workflow
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

- **[OpenSpec](https://github.com/Fission-AI/openspec)** — Influenced the task management format (delta-based specs, Given/When/Then scenarios, requirement-focused organization)
- **[Caveman](https://github.com/JuliusBrussee/caveman)** — Grounding for the v5.4.0 terse-mode design (SessionStart + UserPromptSubmit hook pattern, intensity-filtered SKILL.md injection). See [docs/analysis/caveman/](docs/analysis/caveman/) for the full analysis.
- **[forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)** — Source of the four "Editing Discipline" principles (think before coding, simplicity first, surgical changes, goal-driven execution) inlined in the generated `AGENTS.md`. Grounded in [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on common LLM coding pitfalls.

---

## License

Apache License 2.0 &copy; HiveLLM Team

[Issues](https://github.com/hivellm/rulebook/issues) &middot; [Discussions](https://github.com/hivellm/rulebook/discussions) &middot; [npm](https://www.npmjs.com/package/@hivehub/rulebook)
