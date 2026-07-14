<!-- GIT:START -->
# Git Workflow Rules

## Allow-list (always safe — no authorization needed)

`status` · `diff` · `log` · `blame` · `add <files>` · `commit` (after quality
checks) · `branch`/`tag` (list only)

## Forbidden (require explicit user authorization)

| Command | Why |
|---------|-----|
| `stash` | hidden state gets forgotten |
| `rebase` | rewrites history |
| `reset --hard` | destroys uncommitted changes |
| `checkout -- .` / `restore .` | discards all changes |
| `revert` / `cherry-pick` / `merge` | unexpected commits/conflicts — human judgment |
| `branch -D` | permanent branch deletion |
| `push --force` | overwrites remote — NEVER on main/master |
| `clean -f` | permanently deletes untracked files |
| `checkout <branch>` / `switch` | breaks concurrent AI sessions sharing the worktree |

Multiple AI sessions may share the same working tree — destructive operations
affect ALL of them. Never commit with `--no-verify`.

## Commits

- Conventional Commits, English only: `<type>(<scope>): <description>` — types:
  `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
- Run the full quality gate (type-check → lint → tests) BEFORE every commit.
- Commit only what the task touched; review `git status` + `git diff` first.
- Never commit generated artifacts (dist/, build/, node_modules/, coverage/).

## Branches

- Default branch: `main`. Feature work on `feat/<name>`, fixes on
  `fix/<name>`, releases on `release/vX.Y.Z`.
- Create branches only when the user asks; never switch branches on your own.
<!-- GIT:END -->
