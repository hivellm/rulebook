# Proposal: phase11_github-task-backend

Source: GitHub issue #25 (external v7-perf audit — feature request)

## Why

GitHub-native task coordination (issues as tasks, gh from shell) is
zero-MCP, parallel-agent-safe by construction (shared store, no worktree file
conflicts), human-visible and drift-free. The benchmark ungoverned session
coordinated 13 parallel subagents this way.

## What Changes

Opt-in backend in rulebook.json: tasks.backend=github (repo, label).
proposal→issue body, tasks.md checklist→issue task list, status→labels/state,
archive→close (+spec-delta application unchanged). rulebook_task and the CLI
shell out to gh; agents may use gh directly. CLAUDE.md task line adapts in
github mode.

## Impact

- Affected code: new src/core/tasks/github-backend.ts, task-manager dispatch,
  v7-tools, config types, generators, tests (gh mocked)
- Breaking change: NO (opt-in; file backend remains default)
- User benefit: zero-MCP coordination for parallel fleets
