# Tasks: Agentic CI Code Review

- [x] Create `src/core/review-manager.ts` module
- [x] Implement `getDiffContext(projectRoot)` — get git diff vs main branch
- [x] Implement `buildReviewPrompt(diff, agentsMd, specs)` — structured review prompt
- [x] Implement `runAIReview(prompt, tool)` — run AI tool with review prompt
- [x] Implement `parseReviewOutput(output)` — extract issues/suggestions/summary
- [x] Implement `postGitHubComment(review, prNumber)` using `gh pr comment`
- [x] Add `review` command to CLI with options:
  - [x] `--output terminal` (default, pretty print)
  - [x] `--output github-comment` (post as PR comment via gh CLI)
  - [x] `--output json` (structured JSON output)
  - [x] `--fail-on critical|major|minor` (exit code 1 if issues found)
- [x] Write `templates/ci/rulebook-review.yml` GitHub Actions workflow
- [x] Add review workflow generation option in `workflow-generator.ts`
- [x] Register `review` command in `src/index.ts`
- [x] Write test: diff parsed and review prompt built correctly
- [x] Write test: --fail-on critical exits 1 when CRITICAL issue found
- [x] Write test: --output json produces valid JSON
- [x] Run full test suite
