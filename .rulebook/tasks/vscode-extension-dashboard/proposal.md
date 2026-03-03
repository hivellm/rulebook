# Proposal: Rulebook VSCode Extension Dashboard

## Why

When running multi-agent workflows (e.g., Claude Code with agent teams), agents run in background and there's zero visibility into what's happening until they return feedback to the main chat. There's no way to see:
- Which agents are active and what they're doing
- Task progress across the project
- Ralph autonomous loop status and iterations
- Memory contents and health
- Background Indexer status

This creates a blind spot that makes it hard to manage complex AI-assisted development sessions. A VSCode extension with a visual dashboard solves this by providing real-time visibility into all Rulebook subsystems.

## What Changes

A new VSCode extension (`rulebook-dashboard`) that provides:

1. **Sidebar Panel** — Activity bar icon that opens a Webview panel (similar to Claude Code's chat panel)
2. **Task Dashboard** — View all tasks, their status, progress, and details. Create/archive tasks.
3. **Agent Monitor** — See active agents, their current task, and real-time status
4. **Ralph Status** — View Ralph loop state, iterations, quality gates, pause/resume
5. **Memory Explorer** — Search, browse, and manage memories. Clear/reprocess indexer.
6. **Indexer Status** — Background indexer health, files processed, queue size
7. **Status Bar** — Quick indicator showing active agents count and indexer status

## Impact
- Affected specs: None (new standalone extension)
- Affected code: New `vscode-extension/` directory in project root
- Breaking change: NO
- User benefit: Full visibility into AI-assisted development workflows
