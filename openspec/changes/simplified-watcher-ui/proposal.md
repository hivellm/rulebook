# Proposal: Simplified Progress-Focused Watcher UI

## Why
The current watcher UI has too much information scattered across multiple panels (task details, system info, task list with scrolling) which makes it difficult to focus on what matters: the progress of tasks being executed. Users want a cleaner interface that shows:
- Which task is currently running (with loading indicator)
- A progress bar showing overall completion
- Active logs showing what's happening in real-time
- Automatic removal of completed tasks from the view

The current UI is cluttered and doesn't provide clear visual feedback on progress.

## What Changes
- **REMOVED** Task Details panel (clutters the UI)
- **REMOVED** System Info panel (not essential for task monitoring)
- **REMOVED** Task list scrolling capability (focus on progress, not navigation)
- **ADDED** Loading indicator for current task in progress
- **ADDED** Progress bar showing overall completion percentage
- **IMPROVED** Activity logs now display real-time events
- **IMPROVED** Completed tasks automatically removed from list
- **IMPROVED** Cleaner, focused UI showing only: current tasks + progress bar + activity logs

## Impact
- Affected specs: Watcher UI, task display, progress tracking
- Affected code: `src/core/watcher.ts`, `src/core/modern-console.ts`
- Breaking change: No (UI change only, API remains the same)
- Improved UX: Cleaner, more focused interface
- Better performance: Less components to render

