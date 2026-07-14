# Pre-Commit Hook

Runs before each commit to catch formatting, lint, and type errors early. Keep it fast (< 30 seconds): formatting, linting, and type checking only. Slow work (tests, builds, coverage) belongs in the pre-push hook.

## What the hook runs per language

| Language | Commands |
|----------|----------|
| TypeScript/JavaScript | `npm run format && npm run lint && npm run type-check` |
| Python | `black --check . && ruff check . && mypy .` |
| Rust | `cargo fmt -- --check && cargo clippy -- -D warnings` |
| Go | `gofmt -s -w . && golangci-lint run && go vet ./...` |

Rulebook installs language-specific hooks automatically (`npx @hivehub/rulebook init`); see `templates/hooks/<language>-pre-commit.sh` for the exact scripts.

## Minimal shell hook

```bash
#!/bin/sh
npm run format || exit 1
npm run lint || exit 1
npm run type-check || exit 1
```

Install manually with `cp scripts/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit`, or via husky: `npx husky set .husky/pre-commit "npm run format && npm run lint && npm run type-check"`.

## How to fix failures

- **Format failures**: run the auto-fixer (`npm run format:fix`, `black .`, `cargo fmt`, `gofmt -s -w .`) and re-stage.
- **Lint failures**: `npm run lint:fix` / `ruff check --fix .`, then fix remaining issues by hand. Add generated files to `.eslintignore` / `.prettierignore` rather than loosening rules.
- **Type errors**: fix the reported errors; never suppress with `@ts-ignore` or equivalents.
- **Hook not running**: check `chmod +x .git/hooks/pre-commit`, a valid shebang (`#!/bin/sh`), and the exact filename (no extension).
- **Too slow**: check only staged files (`git diff --cached --name-only --diff-filter=ACM`), or move the slow check to pre-push.
- **Windows issues**: prefer Node-based hooks with `spawn`, POSIX-compliant syntax, forward slashes.

## Bypass (emergencies only)

```bash
git commit --no-verify -m "Emergency fix: production down"
```

Fix the underlying issue immediately after. Never make `--no-verify` routine.

## Related

- `PRE_PUSH.md` — build + test checks before push
- `COMMIT_MSG.md` — commit message validation
- `/.rulebook/specs/quality.md`, `/.rulebook/specs/git.md`
