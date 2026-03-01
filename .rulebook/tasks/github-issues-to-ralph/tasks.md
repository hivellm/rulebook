# Tasks: GitHub Issues → Ralph Stories Import

- [ ] Implement `checkGhCliAvailable()` — verify `gh` CLI is installed
- [ ] Implement `fetchGithubIssues(filters)` using `gh issue list --json`
- [ ] Implement `convertIssueToStory(issue)` — map GitHub issue fields to Ralph story format
- [ ] Extract checklist items (`- [ ] ...`) from issue body as acceptanceCriteria
- [ ] Implement `mergeStoriesIntoExistingPrd(prd, newStories)` — idempotent merge by issue ID
- [ ] Add `ralph import-issues` command to CLI
- [ ] Add `--label <label>` filter option
- [ ] Add `--milestone <name>` filter option
- [ ] Add `--limit <n>` option (default 20)
- [ ] Add `--dry-run` option to preview without writing
- [ ] Show summary: "Imported 5 new stories, updated 2 existing"
- [ ] Register command in `src/index.ts`
- [ ] Write test: issue with checklist → acceptanceCriteria populated
- [ ] Write test: re-import same issue → no duplicate story
- [ ] Write test: `gh` not installed → helpful error message with install link
- [ ] Write test: `--dry-run` → no PRD written
- [ ] Run full test suite
