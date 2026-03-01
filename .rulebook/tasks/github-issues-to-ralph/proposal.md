# Proposal: GitHub Issues → Ralph Stories Import

## Context

Teams already track work in GitHub Issues. Having to manually transcribe issues into Ralph PRD format is friction that prevents adoption. This feature auto-imports GitHub Issues as Ralph user stories.

## Solution

Add `rulebook ralph import-issues` command:

1. Read GitHub Issues from repo (via `gh` CLI or GitHub API)
2. Convert each issue into a Ralph user story:
   ```json
   {
     "id": "GH-42",
     "title": "Issue title from GitHub",
     "description": "Issue body content",
     "acceptanceCriteria": ["Extracted from issue checklist items"],
     "priority": 1,
     "passes": false,
     "notes": "GitHub Issue #42: https://github.com/..."
   }
   ```
3. Merge into existing PRD (don't overwrite existing stories)
4. Mark issues with `ralph:import` label in GitHub (optional)

## Requirements

- Requires `gh` CLI to be installed (checks first, shows install instructions if not)
- Supports filtering by label: `--label "ralph"` or `--milestone "v4.0"`
- Supports limit: `--limit 10` (default: 20)
- Idempotent: re-importing same issue updates story, doesn't duplicate

## Files to Modify

- `src/core/ralph-manager.ts` — add `importGithubIssues()` method
- `src/cli/commands.ts` — add `ralph import-issues` command
- `src/index.ts` — register subcommand
- `tests/ralph-github-import.test.ts` — new test file (mock gh CLI)
