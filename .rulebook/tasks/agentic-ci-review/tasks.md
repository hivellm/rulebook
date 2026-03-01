# Tasks: Agentic CI Code Review

- [ ] Create `src/core/review-manager.ts` module
- [ ] Implement `getDiffContext(projectRoot)` — get git diff vs main branch
- [ ] Implement `buildReviewPrompt(diff, agentsMd, specs)` — structured review prompt
- [ ] Implement `runAIReview(prompt, tool)` — run AI tool with review prompt
- [ ] Implement `parseReviewOutput(output)` — extract issues/suggestions/summary
- [ ] Implement `postGitHubComment(review, prNumber)` using `gh pr comment`
- [ ] Add `review` command to CLI with options:
  - [ ] `--output terminal` (default, pretty print)
  - [ ] `--output github-comment` (post as PR comment via gh CLI)
  - [ ] `--output json` (structured JSON output)
  - [ ] `--fail-on critical|major|minor` (exit code 1 if issues found)
- [ ] Write `templates/ci/rulebook-review.yml` GitHub Actions workflow
- [ ] Add review workflow generation option in `workflow-generator.ts`
- [ ] Register `review` command in `src/index.ts`
- [ ] Write test: diff parsed and review prompt built correctly
- [ ] Write test: --fail-on critical exits 1 when CRITICAL issue found
- [ ] Write test: --output json produces valid JSON
- [ ] Run full test suite
