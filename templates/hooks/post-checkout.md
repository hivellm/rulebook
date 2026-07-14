# Post-Checkout Hook

Runs after `git checkout` / `git clone` to keep the working environment in sync with the new branch: reinstall dependencies when manifests changed, clean stale build artifacts, run pending migrations.

Git passes three arguments: `$1` = previous HEAD ref, `$2` = new HEAD ref, `$3` = flag (`1` = branch checkout, `0` = file checkout). Always exit early when `$3` is `0` — file checkouts should not trigger environment work.

## What the hook runs per language

| Language | Commands (when manifests changed between `$1` and `$2`) |
|----------|----------------------------------------------------------|
| TypeScript/JavaScript | `npm install` if `package.json`/`package-lock.json` changed; clean `dist/`, `node_modules/.cache` |
| Python | `pip install -r requirements.txt` or `poetry install`; `python manage.py migrate` if migrations changed |
| Rust | `cargo update` if `Cargo.toml`/`Cargo.lock` changed |

Detect changes with:

```bash
git diff --name-only "$1" "$2" | grep -q '^package(-lock)?\.json$' && npm install
```

## Minimal shell hook

```bash
#!/bin/sh
# $1 prev HEAD, $2 new HEAD, $3 branch flag
[ "$3" = "0" ] && exit 0
if git diff --name-only "$1" "$2" | grep -qE '^package(-lock)?\.json$'; then
  npm install
fi
exit 0
```

Install with `cp scripts/post-checkout.sh .git/hooks/post-checkout && chmod +x .git/hooks/post-checkout`.

## How to fix failures

- **Hook must never block the checkout** — the checkout has already happened. Always `exit 0`; report problems, don't fail.
- **`npm install` fails after switching**: delete `node_modules` and reinstall, or check the Node version required by the new branch.
- **Hook fires on file checkouts**: ensure the `$3 = 0` guard is present.
- **Slow checkouts**: only act when manifests actually changed (diff `$1..$2`), never unconditionally reinstall.

## Related

- `PRE_COMMIT.md`, `PRE_PUSH.md` — quality gates
- `/.rulebook/specs/git.md` — git workflow
