# Prepare Commit Message Hook

Runs before the commit message editor opens (`.git/hooks/prepare-commit-msg`) to pre-fill the message: derive the Conventional Commit type/scope from the branch name, append issue references, or insert a template.

Git passes: `$1` = commit message file, `$2` = source (`message`, `template`, `merge`, `squash`, `commit`), `$3` = SHA (amend). Skip when `$2` is `merge`, `squash`, or `commit` — never rewrite messages git generated or the user is amending.

## Typical behavior

- Branch `feature/123-user-auth` → prefix `feat: ` and footer `Refs #123`
- Branch `bugfix/api/456-null-response` → `fix(api): ` + `Refs #456`
- Branch prefix mapping: `feature|feat → feat`, `bugfix|fix|hotfix → fix`, `docs → docs`, `chore → chore`, etc.
- Leave the message untouched when it already has a Conventional Commit prefix or when `-m` supplied one.

## Minimal shell hook

```bash
#!/bin/sh
MSG_FILE="$1"; SOURCE="$2"
case "$SOURCE" in merge|squash|commit) exit 0;; esac

BRANCH=$(git rev-parse --abbrev-ref HEAD)
ISSUE=$(echo "$BRANCH" | grep -oE '[0-9]+' | head -1)
case "$BRANCH" in
  feature/*|feat/*) TYPE="feat" ;;
  bugfix/*|fix/*|hotfix/*) TYPE="fix" ;;
  docs/*) TYPE="docs" ;;
  *) exit 0 ;;
esac

# Only prefix if not already conventional
head -1 "$MSG_FILE" | grep -qE '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)' && exit 0
printf '%s: \n\n%s\n%s' "$TYPE" "$(cat "$MSG_FILE")" "${ISSUE:+Refs #$ISSUE}" > "$MSG_FILE"
exit 0
```

Install with `cp scripts/prepare-commit-msg.sh .git/hooks/prepare-commit-msg && chmod +x .git/hooks/prepare-commit-msg`. Alternatively, use a static template: `git config commit.template .gitmessage`.

## How to fix failures

- **Hook must never fail the commit** — always `exit 0`; on any error, leave the message file untouched.
- **Merge commits mangled**: ensure the `$2` source guard is present.
- **Duplicate prefixes**: check the first line for an existing conventional prefix before writing.
- **Wrong issue extracted**: tighten the branch pattern (e.g. require `/<digits>-`) instead of grabbing the first number.

## Related

- `COMMIT_MSG.md` — validates the final message
- `/.rulebook/specs/git.md` — git workflow and commit conventions
