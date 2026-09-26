# @hivehub/rulebook

[![npm version](https://img.shields.io/npm/v/@hivehub/rulebook?logo=npm&logoColor=white)](https://www.npmjs.com/package/@hivehub/rulebook)
[![npm downloads](https://img.shields.io/npm/dm/@hivehub/rulebook?logo=npm&logoColor=white)](https://www.npmjs.com/package/@hivehub/rulebook)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[![Tests](https://img.shields.io/github/actions/workflow/status/hivellm/rulebook/test.yml?label=tests&logo=github)](https://github.com/hivellm/rulebook/actions/workflows/test.yml)
[![Build](https://img.shields.io/github/actions/workflow/status/hivellm/rulebook/build.yml?label=build&logo=github)](https://github.com/hivellm/rulebook/actions/workflows/build.yml)

> Tool-agnostic AI development framework. One `init` generates **`AGENTS.md`** — the universal standard every AI coding agent reads — plus Claude Code integration, quality gates, spec-driven task management, and an MCP server. Auto-detects 28 languages.

**v7 — built to assist frontier models, never to anchor them.** ~3.4k tokens of
session overhead (was ~15k in v6, −77%), 6 consolidated MCP tools, one
path-only guard hook, zero permission prompts for routine work, and (v7.4) an
orchestrator main session that delegates every task to a model-routed subagent,
routed by the TypeSafe (Jev) entry gate on every prompt.
Measured, budgeted in CI, and documented in
[`docs/analysis/v7-performance/`](docs/analysis/v7-performance/README.md).
Upgrading from v6? See the
[migration guide](docs/guides/migration-v6-to-v7.md) — `update --dry-run`
shows the plan first.

---

## Quick Start

```bash
# Initialize — auto-detects languages and sets up rules, gates, and MCP
npx @hivehub/rulebook@latest init

# Update an existing project to the latest rules
npx @hivehub/rulebook@latest update

# Apply the recommended Claude Code setup (MCP, permissions, statusline)
npx @hivehub/rulebook@latest claude
```

Then, inside Claude Code, spec a feature and let the backlog implement itself
(workflows are opt-in — `rulebook claude --workflows` installs them):

```
/spec rate-limit the public REST API   # asks questions, creates rulebook tasks
/rulebook-driver                        # implements every task, fable review gate
```

> Install globally with `npm install -g @hivehub/rulebook` to use `rulebook` directly.

---

## Why Rulebook

AI coding agents produce inconsistent, error-prone code without clear guidelines. Rulebook gives every agent the same rules from a single source of truth — and stays tool-agnostic by generating the **`AGENTS.md`** standard that Claude Code, Cursor, Codex, Gemini, Copilot, and other agents read natively. No per-tool adapters to maintain.

| What | How |
|------|-----|
| **Universal rules** | `AGENTS.md` + `CLAUDE.md` generated from one source — read natively by any AGENTS.md-aware agent |
| **Quality gates** | Pre-commit (lint, type-check, format) + pre-push (build, tests) hooks — language-aware, cross-platform |
| **Spec-driven tasks** | OpenSpec-compatible tasks with a docs + tests tail — check it or archive with a one-line waiver |
| **6 MCP tools** | `rulebook_task` / `_memory` / `_session` / `_skill` / `_rules` / `_gate` (+ `_workspace` in workspace mode) — action-parameterized, ~4.9 KB of schemas total |
| **Lean by design** | One path-only guard hook, full-autonomy permissions, no content regexes, no ceremony for small fixes |
| **28 languages** | Auto-detected with confidence scores; language-specific templates and CI/CD workflows |

---

## Core Features

### Orchestrator main session (v7.4)

The generated rules make the main session plan, delegate and monitor — it
never does the work itself. Each task goes to one subagent (independent ones in
parallel), and every agent call names its model: **Fable 5.1** for
architecture, hard bugs and review; **Opus 5.5** for edits, tests, docs and
refactors; **Haiku 4.5** for research and summaries. The TypeSafe (Jev)
[entry gate](#typesafe-jev-integration--on-by-default) routes each prompt
first. Details: [Multi-Agent Workflows](#multi-agent-workflows).

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

#### Decision requests: no more silently stuck tasks

An agent that reaches a choice the spec does not settle is told to decide it
when the choice is reversible and in scope, and otherwise to file an explicit
**decision request** instead of burying the question in prose:

```bash
rulebook task ask phase1_add-auth -q "Which identity provider?" \
  -o "Auth0 — hosted, fastest" -o "Keycloak — self-hosted" -r "Auth0" -b "1.2 wire login"
rulebook task questions                  # everything awaiting the operator
rulebook task answer phase1_add-auth     # interactive form: pick an option or type a decision
```

Filing a question marks the task `blocked` and hands the agent a ready-to-show
operator prompt (Claude Code renders it as an `AskUserQuestion` form). Answering
records the decision on the task and moves it back to `in-progress`. A task
cannot be marked `blocked` without an open question or a `blockedBy`
dependency, and cannot be archived over an open question. Open questions are
listed by `rulebook_session start`, `rulebook_task {action:"questions"}`,
`.rulebook/STATE.md` and the tasks README, so they are seen before new work
starts. The `rulebook-driver` workflow stops with `awaiting-decision` instead
of looping on a blocked item. Both task backends support it.

#### Task backend: files (default) or GitHub issues

By default tasks are directories under `.rulebook/tasks/`. Projects running
several agents at once can switch to GitHub issues instead, where one issue is
one task:

```jsonc
// .rulebook/rulebook.json
{ "tasks": { "backend": "github", "repo": "owner/name", "label": "rulebook-task" } }
```

The commands above and the `rulebook_task` MCP tool are unchanged — they talk
to whichever backend is configured, and agents can equally drive `gh` directly.
`repo` is optional (`gh` infers it from the remote).

Why switch: GitHub is a shared store, so parallel agents — including ones in
separate worktrees or on other machines — coordinate without conflicting on
task files. Progress renders natively in the issue, and task state cannot
diverge between branches because it does not live in the repo.

What moves into the issue: `proposal.md`, `tasks.md`, `design.md` and any
`specs/<module>/spec.md` become marked sections of the issue body. Status maps
to a `rulebook-status:<state>` label, and archiving closes the issue. Project
specs under `.rulebook/specs/` stay on disk either way.

Requires `gh` on PATH and authenticated (`gh auth login`); rulebook says so
plainly rather than failing obscurely if it is missing.

### Knowledge, decisions & learnings

Lightweight, file-based project memory — plain markdown, searchable, committed with your repo.

```bash
rulebook knowledge list      # patterns and anti-patterns
rulebook decision list       # architecture decision records
rulebook learn list          # captured implementation learnings
```

#### Recurring requests become skills

Context is limited and sessions rotate, so a procedure worked out once is
re-derived the next time the operator asks for it. Rulebook now closes that
loop: capturing a learning under the **same title** again bumps its count
instead of duplicating it, learnings seen twice or more show up as
`skillCandidates` in `rulebook_session start`, and one call turns the
procedure into a project skill:

```bash
rulebook learn promote <learning-id> skill   # → .claude/skills/<slug>/SKILL.md
rulebook skills list --category project      # project skills, next to packaged ones
```

The generated `SKILL.md` is scaffolded as a procedure (when to use, steps,
verify), is user-owned, survives `rulebook update`, and is reloaded by the
harness on demand. Promotion never overwrites an existing skill.

### Structural enforcement

A single `PreToolUse` hook blocks forbidden patterns at the tool level — before edits reach disk: `deferred`/`skip`/`later`/`TODO` in tasks.md, stubs/placeholders/`HACK`/`FIXME` in source, and manual task-file creation in `.rulebook/tasks/`. Cross-platform (Node.js, no `jq` dependency), and short-circuits in pure bash so a normal edit costs ~one process spawn.

A second guard, `no-os-scheduling`, enforces Tier 1 prohibition #7: scheduling
lives in the application, never in the OS. It denies `Bash` commands that
create or install OS schedules (`crontab -e`, `at`, `systemctl enable … .timer`,
`launchctl load`, `schtasks /create`, `Register-ScheduledTask`) and
`Edit`/`Write` targets under scheduler directories (`/etc/cron*`,
`LaunchAgents/`, `*.timer`). Reads like `crontab -l` or `systemctl status`
pass; a keyword prefilter keeps everything else on the fast path.

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

**Orchestrator model (v7.4).** The generated rules make the main session an
orchestrator: it never does the work itself. It plans, then delegates each task
to one subagent — independent ones in parallel — and reads their reports, not
the files. Every agent call names its model:

| Model | Use for |
|-------|---------|
| **Fable 5.1** | Architecture, complex bugs, code review |
| **Opus 5.5** | Edits, tests, documentation, refactoring (simple work never goes to Fable) |
| **Haiku 4.5** | Research, summaries |

Each subagent owns one rulebook task: it checks items off as it goes and drives
the task through the quality gate to archive. The main session monitors the
agents, pauses or restarts one that stalls or drifts, reviews each archived
task, and updates the CHANGELOG. Full protocol: `.rulebook/specs/orchestration.md`.

Orchestrated [Claude Code Workflow](https://code.claude.com/docs/en/workflows) scripts are **opt-in** (agents and workflows no longer install by default — native harness agents cover the roles). When installed into `.claude/workflows/`, each fans work across bundled agents with the same routing — `haiku` for research, `opus` for implementation, tests, and docs, `fable` for design and review gates.

| Workflow | What it does |
|----------|--------------|
| `rulebook-driver` | Loops the backlog: next unchecked item → implement (SDD+TDD) → independent **fable** review gate (≤3 rounds) → document → next |
| `spec-author` | Research → draft proposal + SHALL/MUST spec → **fable** gap-critic returns ranked questions + gaps |
| `feature-pipeline` | research → architect (fable) → implement → test → **fable** review → document |
| `bugfix` | root-cause → TDD fix → **fable** quality-gatekeeper verdict (≤2 rounds) |
| `review-fanout` | Adversarial multi-dimension review of the diff, each finding verified by **fable**, **opus** synthesis |
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
rulebook claude --model fable   # same, but set the default model (default: opus)
```

It installs the MCP server entry and the Rulebook-specific skills, then layers the v7 `.claude/settings.json` (agents/workflows are opt-in):

| Applied | Detail |
|---------|--------|
| Hooks | Path-only `PreToolUse` guards (task scaffolding, `no-os-scheduling`); with TypeSafe on, the fail-open Jev prompt hook on `UserPromptSubmit` (and the opt-in tool-call gate) — nothing on Stop/SessionStart, no content regexes |
| Full-autonomy permissions | `defaultMode: acceptEdits` + broad allow list (Bash/Edit/Write/Agent/WebFetch/…) — ~0 permission prompts for routine work |
| `statusLine` | project dir + git branch + context meter (`ctx NN%`) |
| `model` | cost-aware default (`opus`) |

All settings are **additive and non-clobbering** — existing `permissions.allow`, a user-authored `statusLine`, and an explicit `model` are preserved. Requires Claude Code installed (`~/.claude`); otherwise it no-ops with a notice.

---

### TypeSafe (Jev) integration — on by default

[TypeSafe](https://typesafe.ai) turns natural language and application state
into typed judgments (routing, ranking, extraction, verification) through its
System One model, Jev, and ships a Claude Code plugin with the skill that
teaches agents to build with it. Since v7.4 `init`, `update` and `claude`
enable it without asking, unless you opt out (only where Claude Code is
detected):

```bash
rulebook init                   # enabled by default
rulebook update --no-typesafe   # opt out (stored; a stored "no" is never overridden)
rulebook claude --typesafe      # force it back on
```

When enabled, rulebook checks `~/.claude/plugins/installed_plugins.json` and
installs `typesafe@typesafe-ai` only if it is missing (`claude plugin
marketplace add typesafe-ai/skills`, then `claude plugin install
typesafe@typesafe-ai`), writes `.claude/rules/typesafe.md` so the agent knows
to use the `/typesafe:typesafe-ai` skill and the gate, and looks for
`TYPESAFE_API_KEY` in the shell or the project's untracked `.env`. If the key
is missing it prints where to create one (https://console.typesafe.ai/keys);
the gate starts working once it is set. Rulebook never writes the key — never
commit it. The choice is stored in `rulebook.json`
(`integrations.typesafe.enabled`).

With TypeSafe on, Jev gates the session at three points. All of them fail
open: no key, `RULEBOOK_GATE=off`, a timeout or any error lets the prompt or
tool call through unchanged. Full reference:
[`docs/MCP_SERVER.md`](docs/MCP_SERVER.md#entry-gate-v74-rulebook_gate).

- **Entry gate** — `rulebook_gate {prompt}` (MCP) or `rulebook gate "<prompt>"`
  (CLI) sends the prompt and a short project description to Jev and returns a
  `routing`: request kind, task, model, subagent type, skill, and risk flags.
  Advisory, never blocking; `rulebook gate --check` tests the key.
- **Prompt hook** (`UserPromptSubmit`, on by default) — runs the gate on every
  prompt and hands the routing to the model as context. It blocks only a
  high-confidence OS-scheduling request (`gate.promptHook.blockThreshold`,
  default 0.9); destructive git and secrets only warn. Turn it off with
  `"gate": {"promptHook": {"enabled": false}}` and `rulebook update`.
- **Project scope** (`gate.scope`) — the gate also asks whether the prompt
  belongs to this project (description from `gate.scope.description`,
  `package.json`, or this README). When it looks off-topic
  (`gate.scope.offTopicBelow`, default 0.15), `onOffTopic: "ask"` (default)
  tells the model to confirm with the operator; `"block"` stops the prompt.
- **Tool-call gate** (`PreToolUse`, opt-in) — `"gate": {"toolHook":
  {"enabled": true}}` checks each `Bash|Edit|Write` call. Cheap checks run
  first (the OS-scheduling guard, a deterministic destructive-git `ask`), then
  one Jev request with a redacted summary answers `deny` or `ask` with a
  reason. It never answers `allow`, so your permission rules still decide.

## MCP Server

MCP tools over stdio transport. Zero configuration after `rulebook mcp init`.

```bash
rulebook mcp init    # One-time setup — configures .mcp.json automatically
```

| Tool | Actions |
|------|---------|
| `rulebook_task` | create · list · show · update · archive (`tailWaiver`) · validate · delete |
| `rulebook_memory` | knowledge / learnings / decisions × add · list · show · update · promote |
| `rulebook_session` | start (plans + tasks + learnings in ONE call) · end (rotating history) |
| `rulebook_skill` | list · show · search · enable · disable · validate |
| `rulebook_rules` | list project rules |
| `rulebook_gate` | `{prompt, notes?}` → Jev `routing` for the prompt (advisory; see [TypeSafe](#typesafe-jev-integration--on-by-default)) |
| `rulebook_workspace` | list · status · tasks (workspace mode only) |

Workspace routing is automatic: pass any file `path` and the server resolves
the owning project (explicit `projectId` overrides).

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
rulebook gate "<prompt>"         # Jev routing for a prompt (--json for the full result)
rulebook gate --check            # Key found? One cheap live call (--strict exits 2 if unavailable)

# Tasks
rulebook task create <task-id>   # Create (phase-prefixed: phase1_add-auth)
rulebook task list               # List active tasks
rulebook task archive <task-id>  # Archive a completed task
rulebook task ask <task-id> -q "<question>" -o "<A — trade-off>" -r "<A>"   # File a decision request (task → blocked)
rulebook task questions          # Open decision requests awaiting the operator
rulebook task answer <task-id>   # Answer one (interactive form; or pass <question-id> <answer>)

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
- **[Jev](https://typesafe.ai)** — the System One model by TypeSafe, which powers the rulebook entry gate (`rulebook_gate`, prompt hook, project scope and tool-call gate).

---

## License

Apache License 2.0 &copy; HiveLLM Team

[Issues](https://github.com/hivellm/rulebook/issues) &middot; [Discussions](https://github.com/hivellm/rulebook/discussions) &middot; [npm](https://www.npmjs.com/package/@hivehub/rulebook)
