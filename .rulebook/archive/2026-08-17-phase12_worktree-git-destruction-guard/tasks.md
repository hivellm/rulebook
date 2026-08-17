## 1. Implementation

- [x] 1.1 `templates/git/git-workflow.md`: worktree lifecycle section — placement outside the repo tree (`../<repo>-wt-<name>`), removal via `git worktree remove` + `prune`, never `rm -rf` a worktree path
- [x] 1.2 `templates/git/git-workflow.md`: forbidden table rows — `rm -rf` on a computed/variable path unverified as non-empty and non-repo-root; any delete/move/overwrite of `.git`
- [x] 1.3 `templates/core/prohibitions.md`: qualify the `git worktree` blessing so it covers create/use only, and state that cleanup stays under Tier 1 #3 (no deletion without authorization)
- [x] 1.4 `templates/core/prohibitions.md`: `.git` destruction as an absolute, no-exception prohibition
- [x] 1.5 `templates/core/claude-md.md`: short form in the Git safety block — worktrees sibling-placed, removed with `git worktree remove`, never `rm -rf`
- [x] 1.6 Regenerate mirrors (`.rulebook/specs/git.md`, `.rulebook/specs/prohibitions.md`, `CLAUDE.md`) and confirm sentinel blocks match their templates
- [x] 1.7 `node scripts/measure-overhead.mjs` → ALL BUDGETS PASS; record the ledger row in `docs/analysis/.../05-budget-and-metrics.md`
- [x] 1.8 `CHANGELOG.md` 7.0.2 entry + version bump in `package.json`

## 2. Tail (docs + tests — check or waive with tailWaiver)

- [x] 2.1 Update or create documentation covering the implementation
- [x] 2.2 Write tests covering the new behavior — generator tests asserting the worktree/`.git` clauses survive into generated `CLAUDE.md` and both specs, so a future template edit cannot silently drop them
- [x] 2.3 Run tests and confirm they pass
