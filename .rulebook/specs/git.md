<!-- GIT:START -->

**AI Assistant Git Push Mode**: AUTO

**INFO**: Automatic push enabled.
AI assistants may execute push commands automatically.

⚠️ Only use this mode if:
- SSH key has no password
- GitHub CLI is authenticated
- You trust the AI assistant completely

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
| `merge`/`rebase` into the DEFAULT branch | goes through an approved PR, never directly |
| `branch -D` | permanent branch deletion |
| `push --force` | overwrites remote — NEVER on main/master |
| `clean -f` | permanently deletes untracked files |
| switching a SHARED checkout with foreign changes | breaks concurrent sessions — use `git worktree` |

Multiple AI sessions may share the same working tree — destructive operations
affect ALL of them. Never commit with `--no-verify`.

## Commits

- Conventional Commits, English only: `<type>(<scope>): <description>` — types:
  `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
- Per commit: type-check + lint + tests covering the change. Per push/PR:
  the full quality gate — all green.
- Commit only what the task touched; review `git status` + `git diff` first.
- Never commit generated artifacts (dist/, build/, node_modules/, coverage/).

## Branches

- Default branch: `main`. Feature work on `feat/<name>`, fixes on
  `fix/<name>`, releases on `release/vX.Y.Z`.
- Branch freely for your own work and open PRs for review. Create/switch/merge
  YOUR agent-created branches autonomously; prefer `git worktree` for parallel
  agents. Never switch a shared checkout that has changes you did not author.
<!-- GIT:END -->