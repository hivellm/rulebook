# Usage Examples

End-to-end examples for the most common Rulebook workflows. All commands are run
from your project root. Slash commands (`/spec`, `/rulebook-driver`, …) are run
**inside Claude Code**; `rulebook …` commands are run in your terminal.

## Contents

- [First-time setup](#first-time-setup)
- [Spec → implement a feature (the full loop)](#spec--implement-a-feature-the-full-loop)
- [Drive the whole backlog](#drive-the-whole-backlog)
- [Fix a bug (TDD + opus gate)](#fix-a-bug-tdd--opus-gate)
- [Build one feature end-to-end](#build-one-feature-end-to-end)
- [Review the current diff](#review-the-current-diff)
- [Pre-release go/no-go](#pre-release-gono-go)
- [Manual task management](#manual-task-management)

---

## First-time setup

Initialize Rulebook in a project, then apply the recommended Claude Code setup.

```bash
# In your terminal, from the project root:
rulebook init            # detects languages/tools, writes AGENTS.md + .rulebook/
rulebook claude          # installs MCP, agents, workflows + opinionated settings
```

`rulebook claude` is idempotent — re-run it any time to (re)apply the recommended
configuration. Override the default model with `rulebook claude --model opus`.
Restart Claude Code afterward to load the new `.claude/settings.json`.

To confirm everything is wired up:

```bash
rulebook doctor          # health checks: file sizes, broken imports, stale state
```

---

## Spec → implement a feature (the full loop)

The intended path for a non-trivial feature: author a spec interactively, let it
create the rulebook tasks, then let the driver implement them.

**1. Author the spec (inside Claude Code).** `/spec` runs in the conversation,
so it can ask you questions:

```
/spec rate-limit the public REST API
```

It will:
1. Research the codebase and draft a proposal + SHALL/MUST spec.
2. Ask you ranked clarifying questions (e.g. *"Per-IP or per-API-key limiting?"*,
   *"What response on limit exceeded — 429 with Retry-After?"*).
3. Iterate until there are no open questions.
4. Show you the final spec and ask **"Create these rulebook tasks?"**
5. On confirmation, create the tasks via the Rulebook MCP tools and validate them.

**2. Implement the backlog (inside Claude Code).**

```
/rulebook-driver
```

The driver discovers the first unchecked item, implements it (tests first),
gates it through an independent **opus** reviewer, documents it, and moves to the
next — until the backlog is drained.

> Tip: review the generated tasks first with `rulebook task list` /
> `rulebook task show <id>` before running the driver.

---

## Drive the whole backlog

If you already have rulebook tasks (from `/spec`, `rulebook task create`, or an
`/analysis`), drive them:

```
/rulebook-driver                       # drain everything
/rulebook-driver { "once": true }      # just the next item, then stop
/rulebook-driver { "maxItems": 5 }     # at most 5 items this run
/rulebook-driver { "minBudget": 100000 }   # stop before an item if < 100k tokens left
```

The loop halts early if an item fails review after 3 rounds (it won't build the
next, dependent item on top of a broken one) — fix that item, then re-run.

---

## Fix a bug (TDD + opus gate)

```
/bugfix { "bug": "tasks.md checkbox state is lost after archiving a task" }
```

Flow: root-cause (no guessing) → write a **failing** regression test that
reproduces it → fix until green → independent **opus** quality-gatekeeper
confirms the root cause is fixed and covered (max 2 rounds).

---

## Build one feature end-to-end

When you have a clear feature and don't need the spec/question loop:

```
/feature-pipeline { "feature": "add CSV export to the reports page" }
```

Flow: research → architect (opus) → implement → test → **opus** review →
document. Sequential, because each stage depends on the previous one.

---

## Review the current diff

Review uncommitted/staged changes before you commit:

```
/review-fanout
```

Runs four independent reviewers in parallel — correctness, security,
performance, tests — verifies each finding to drop false positives, and returns
an **opus**-synthesized report grouped by severity.

---

## Pre-release go/no-go

```
/release-gate
```

Runs build + type-check, the full test suite with coverage, a dependency/secret
audit, and a docs-freshness check in parallel, then returns a single go/no-go
verdict.

---

## Manual task management

You don't need a workflow to manage tasks — the CLI and MCP tools work directly:

```bash
rulebook task create phase1_add-csv-export   # create (phase-prefixed id)
rulebook task list                           # list active tasks
rulebook task show phase1_add-csv-export     # show proposal + checklist
rulebook task validate phase1_add-csv-export # check spec format
rulebook task archive phase1_add-csv-export  # archive when done
```

Then hand the backlog to `/rulebook-driver` as shown above.
