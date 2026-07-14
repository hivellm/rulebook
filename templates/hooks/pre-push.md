# Pre-Push Hook

Runs before `git push` to enforce the expensive quality gates: build succeeds, all tests pass, coverage meets the threshold. Fast checks (format, lint, type-check) belong in the pre-commit hook.

## What the hook runs per language

| Language | Commands |
|----------|----------|
| TypeScript/JavaScript | `npm run build && npm test && npm run test:coverage` |
| Python | `pytest --cov --cov-fail-under=95` |
| Rust | `cargo build --release && cargo test --all` |
| Go | `go build ./... && go test ./... -cover` |

Run build FIRST — it is the fastest to fail. Rulebook installs language-specific hooks automatically (`npx @hivehub/rulebook init`); see `templates/hooks/<language>-pre-push.sh` for the exact scripts.

## Minimal shell hook

```bash
#!/bin/sh
npm run build || exit 1
npm test || exit 1
npm run test:coverage || exit 1
```

Install with `cp scripts/pre-push.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push`, or via husky: `npx husky set .husky/pre-push "npm run build && npm test"`.

## How to fix failures

- **Build failures**: fix compile errors at the source; never push code that does not build.
- **Test failures**: fix the root cause. Never `.skip()`, `.only()`, or comment out failing tests to get past the hook.
- **Coverage below threshold**: add meaningful tests for the uncovered paths; do not lower the threshold to pass.
- **Hook not running**: check `chmod +x .git/hooks/pre-push`, shebang, and exact filename.
- **Too slow**: cache builds, run tests in parallel, or restrict to packages affected by the pushed commits — but never remove the test gate entirely.

## Bypass (emergencies only)

```bash
git push --no-verify
```

Reserve for genuine emergencies (e.g. production hotfix); fix the failing gates immediately after.

## Related

- `PRE_COMMIT.md` — fast checks before commit
- `/.rulebook/specs/quality.md`, `/.rulebook/specs/git.md`
