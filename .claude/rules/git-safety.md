# Git safety — explicit allow-list, forbidden destructive operations

# Git Safety Rules

## Allowed (always safe)
- `git status`, `git diff`, `git log`, `git blame`
- `git add <files>`, `git commit` (after quality checks)

## Forbidden (require explicit user authorization)
- `git stash` — hidden state gets forgotten
- `git rebase` — rewrites history
- `git reset --hard` — destroys uncommitted changes
- `git checkout -- .` / `git restore .` — discards all changes
- `git revert` — creates unexpected commits
- `git cherry-pick` — can cause conflicts
- `git merge` — requires human judgment
- `git branch -D` — permanent branch deletion
- `git push --force` — NEVER on main/master
- `git clean -f` — permanently deletes untracked files
- `git checkout <branch>` / `git switch` — breaks concurrent AI sessions

Multiple AI sessions may share the same working tree. Branch switching or destructive operations affect ALL concurrent sessions.
