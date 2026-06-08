# @hivehub/rulebook

[![npm version](https://img.shields.io/npm/v/@hivehub/rulebook?logo=npm&logoColor=white)](https://www.npmjs.com/package/@hivehub/rulebook)
[![npm downloads](https://img.shields.io/npm/dm/@hivehub/rulebook?logo=npm&logoColor=white)](https://www.npmjs.com/package/@hivehub/rulebook)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[![Tests](https://img.shields.io/github/actions/workflow/status/hivellm/rulebook/test.yml?label=tests&logo=github)](https://github.com/hivellm/rulebook/actions/workflows/test.yml)
[![Build](https://img.shields.io/github/actions/workflow/status/hivellm/rulebook/build.yml?label=build&logo=github)](https://github.com/hivellm/rulebook/actions/workflows/build.yml)

> Tool-agnostic AI development framework. One `init` generates **`AGENTS.md`** — the universal standard every AI coding agent reads — plus Claude Code integration, quality gates, spec-driven task management, and an MCP server. Auto-detects 28 languages.

---

## Quick Start

```bash
# Initialize — auto-detects languages and sets up rules, gates, and MCP
npx @hivehub/rulebook@latest init

# Update an existing project to the latest rules
npx @hivehub/rulebook@latest update

# Apply the recommended Claude Code setup (MCP, agents, workflows, settings)
npx @hivehub/rulebook@latest claude
```

Then, inside Claude Code, spec a feature and let the backlog implement itself:

```
/spec rate-limit the public REST API   # asks questions, creates rulebook tasks
/rulebook-driver                        # implements every task, opus review gate
```

> Install globally with `npm install -g @hivehub/rulebook` to use `rulebook` directly.

---

## Why Rulebook

AI coding agents produce inconsistent, error-prone code without clear guidelines. Rulebook gives every agent the same rules from a single source of truth — and stays tool-agnostic by generating the **`AGENTS.md`** standard that Claude Code, Cursor, Codex, Gemini, Copilot, and other agents read natively. No per-tool adapters to maintain.

| What | How |
|------|-----|
| **Universal rules** | `AGENTS.md` + `CLAUDE.md` generated from one source — read natively by any AGENTS.md-aware agent |
| **Quality gates** | Pre-commit (lint, type-check, format) + pre-push (build, tests) hooks — language-aware, cross-platform |
| **Spec-driven tasks** | OpenSpec-compatible tasks with mandatory docs + tests + verify tail, driven by an opus review gate |
| **MCP tools** | Task management, skills, decisions, knowledge, learnings, workspace — over Model Context Protocol |
| **Structural enforcement** | A `PreToolUse` hook blocks stubs/TODOs/deferred tasks before edits reach disk |
| **28 languages** | Auto-detected with confidence scores; language-specific templates and CI/CD workflows |

---

## Core Features

### Modular rules

Rulebook generates a thin `@import` chain instead of one massive file:

```
CLAUDE.md (thin, ~100 lines)
  @imports AGENTS.md          — team-shared rules
  @imports AGENTS.override.md — your project overrides (survives updates)
  @imports .rulebook/STATE.md — live task/health status
  @imports .rulebook/PLANS.md — session scratchpad
```

`AGENTS.md` is the portable, tool-agnostic output. Path-scoped rules in `.claude/rules/` load only when the agent touches matching files (e.g. TypeScript rules for `.ts` files). A small set of always-on rules enforce core behaviors: diagnostic-first, fail-twice-escalate, no-deferred, no-shortcuts, sequential-editing.

### Task management

Spec-driven development in an OpenSpec-compatible format — phase-prefixed task IDs, a mandatory tail (docs + tests + verify), and automatic archival.

```bash
rulebook task create phase1_add-auth    # Create task with structure
rulebook task list                       # See pending work
rulebook task validate phase1_add-auth   # Check format
rulebook task archive phase1_add-auth    # Archive when done
```

Each task gets `proposal.md` (why), `tasks.md` (checklist), and `specs/` (SHALL/MUST requirements with Given/When/Then scenarios).

### Knowledge, decisions & learnings

Lightweight, file-based project memory — plain markdown, searchable, committed with your repo.

```bash
rulebook knowledge list      # patterns and anti-patterns
rulebook decision list       # architecture decision records
rulebook learn list          # captured implementation learnings
```

### Structural enforcement

A single `PreToolUse` hook blocks forbidden patterns at the tool level — before edits reach disk: `deferred`/`skip`/`later`/`TODO` in tasks.md, stubs/placeholders/`HACK`/`FIXME` in source, and manual task-file creation in `.rulebook/tasks/`. Cross-platform (Node.js, no `jq` dependency), and short-circuits in pure bash so a normal edit costs ~one process spawn.

### Multi-project workspace

One MCP server manages every project in a monorepo, with fully isolated per-project managers.

```bash
rulebook workspace init                 # Create workspace config
rulebook workspace add ./frontend       # Add projects
rulebook mcp init --workspace           # Single MCP for all
```

Auto-discovers from `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`, or `*.code-workspace`.

---

## Multi-Agent Workflows

`rulebook init`/`update` installs orchestrated [Claude Code Workflow](https://code.claude.com/docs/en/workflows) scripts into `.claude/workflows/`. Each fans work across bundled agents with cost-tiered models — `haiku` for read-only steps, `sonnet` for implementation, `opus` for the final review gate.

| Workflow | What it does |
|----------|--------------|
| `rulebook-driver` | Loops the backlog: next unchecked item → implement (SDD+TDD) → independent **opus** review gate (≤3 rounds) → document → next |
| `spec-author` | Research → draft proposal + SHALL/MUST spec → **opus** gap-critic returns ranked questions + gaps |
| `feature-pipeline` | research → architect (opus) → implement → test → **opus** review → document |
| `bugfix` | root-cause → TDD fix → **opus** quality-gatekeeper verdict (≤2 rounds) |
| `review-fanout` | Adversarial multi-dimension review of the diff, each finding verified, **opus** synthesis |
| `release-gate` | Parallel build / tests+coverage / security / docs → single go/no-go |

The independent reviewers run as fresh subagents with **no developer context** — they see only the `git diff` plus the spec, so the gate is a genuine second opinion.

```
/rulebook-driver                              # drain the whole backlog
/spec-author { "topic": "rate-limit the public API" }
/review-fanout                                # reviews the current git diff
/release-gate                                 # go/no-go before a release
```

---

## Claude Code Setup

`rulebook claude` applies the recommended Claude Code setup in one idempotent, non-interactive step.

```bash
rulebook claude                 # apply the recommended setup
rulebook claude --model opus    # same, but set the default model (default: sonnet)
```

It installs the MCP server entry, skills, agent definitions, and workflows, then layers an opinionated, cost-aware `.claude/settings.json`:

| Applied | Detail |
|---------|--------|
| Hook | a single `PreToolUse` quality-enforcement hook (no per-turn or per-session hooks by default) |
| Permissions allowlist | auto-approves safe read-only Bash (`ls`/`cat`/`grep`/`rg`/`find`/`git status\|diff\|log\|blame`/`npm run type-check`/`npm test`) + `mcp__rulebook` |
| `statusLine` | shows project dir + git branch |
| `model` | cost-aware default (`sonnet`; `opus` stays reserved for the workflow review gates) |

All settings are **additive and non-clobbering** — existing `permissions.allow`, a user-authored `statusLine`, and an explicit `model` are preserved. Requires Claude Code installed (`~/.claude`); otherwise it no-ops with a notice.

---

## MCP Server

MCP tools over stdio transport. Zero configuration after `rulebook mcp init`.

```bash
rulebook mcp init    # One-time setup — configures .mcp.json automatically
```

| Category | Tools |
|----------|-------|
| Tasks | create, list, show, update, validate, archive, delete |
| Skills | list, show, enable, disable, search, validate |
| Knowledge | add, list, show |
| Decisions | create, list, show, update |
| Learnings | capture, list, promote |
| Workspace | list, status, search, tasks |
| Other | rules list, session start/end |

All tools accept an optional `projectId` for workspace routing.

---

## CLI Reference

```bash
# Project setup
rulebook init                    # Interactive setup (auto-detects everything)
rulebook init --minimal          # Essentials only
rulebook init --lean             # AGENTS.md as a <3KB index
rulebook update                  # Update to the latest rules
rulebook doctor                  # Health checks (file sizes, broken imports, stale state)
rulebook claude                  # Apply the recommended Claude Code setup

# Tasks
rulebook task create <task-id>   # Create (phase-prefixed: phase1_add-auth)
rulebook task list               # List active tasks
rulebook task archive <task-id>  # Archive a completed task

# Knowledge / decisions / learnings
rulebook knowledge list
rulebook decision list
rulebook learn list

# Workspace
rulebook workspace init
rulebook workspace add <path>
rulebook workspace status

# CI/CD & quality
rulebook workflows               # Generate GitHub Actions
rulebook check-coverage          # Check test coverage
rulebook version <major|minor|patch>
```

---

## Supported Languages

TypeScript, JavaScript, Python, Rust, Go, Java, Kotlin, C, C++, C#, PHP, Ruby, Swift, Elixir, Dart, Scala, Haskell, Julia, R, Lua, Solidity, Zig, Erlang, Ada, SAS, Lisp, Objective-C, SQL — auto-detected with confidence scores, each with language-specific templates and CI/CD workflows.

---

## Configuration

All config lives in `.rulebook/rulebook.json`:

```json
{
  "version": "6.0.0",
  "mode": "full",
  "features": {
    "gitHooks": true,
    "templates": true,
    "parallel": true,
    "smartContinue": true
  }
}
```

**Key files generated by Rulebook:**

| File | Purpose |
|------|---------|
| `AGENTS.md` | Team-shared, tool-agnostic AI rules (regenerated on update) |
| `AGENTS.override.md` | Your project overrides (survives updates) |
| `CLAUDE.md` | Claude Code entry point with `@imports` |
| `.claude/rules/` | Path-scoped rules (language-specific + always-on) |
| `.claude/settings.json` | The quality-enforcement hook + permissions for Claude Code |
| `.rulebook/tasks/` | Active task directories |
| `.rulebook/STATE.md` | Machine-written live status |

---

## Documentation

Full documentation in [`/docs`](docs/):

- [Usage Examples](docs/usage-examples.md) — end-to-end flows for every workflow
- [Getting Started](docs/guides/GETTING_STARTED.md)
- [Best Practices](docs/guides/BEST_PRACTICES.md)

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

- **[OpenSpec](https://github.com/Fission-AI/openspec)** — influenced the task-management format (delta-based specs, Given/When/Then scenarios, requirement-focused organization).
- **[forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)** — source of the four "Editing Discipline" principles (think before coding, simplicity first, surgical changes, goal-driven execution) inlined in the generated `AGENTS.md`, grounded in [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on common LLM coding pitfalls.

---

## License

Apache License 2.0 &copy; HiveLLM Team

[Issues](https://github.com/hivellm/rulebook/issues) &middot; [Discussions](https://github.com/hivellm/rulebook/discussions) &middot; [npm](https://www.npmjs.com/package/@hivehub/rulebook)
