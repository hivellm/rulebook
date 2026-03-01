# Tasks: GitHub Issues → Ralph Stories Import

- [x] Implement `checkGhCliAvailable()` — verify `gh` CLI is installed
- [x] Implement `fetchGithubIssues(filters)` using `gh issue list --json`
- [x] Implement `convertIssueToStory(issue)` — map GitHub issue fields to Ralph story format
- [x] Extract checklist items (`- [ ] ...`) from issue body as acceptanceCriteria
- [x] Implement `mergeStoriesIntoExistingPrd(prd, newStories)` — idempotent merge by issue ID
- [x] Add `ralph import-issues` command to CLI
- [x] Add `--label <label>` filter option
- [x] Add `--milestone <name>` filter option
- [x] Add `--limit <n>` option (default 20)
- [x] Add `--dry-run` option to preview without writing
- [x] Show summary: "Imported 5 new stories, updated 2 existing"
- [x] Register command in `src/index.ts`
- [x] Write test: issue with checklist → acceptanceCriteria populated
- [x] Write test: re-import same issue → no duplicate story
- [x] Write test: `gh` not installed → helpful error message with install link
- [x] Write test: `--dry-run` → no PRD written
- [x] Run full test suite
