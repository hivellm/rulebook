---
name: "Rulebook Terse Commit"
description: "Terse Conventional Commits generator. Subject ≤50 chars (hard cap 72), body only when 'why' isn't obvious, no filler. Use when user says 'write a commit', 'generate commit', 'commit message', or invokes /rulebook-terse-commit. Independent of the base rulebook-terse mode."
version: "1.0.0"
category: "core"
author: "Rulebook"
tags: ["core", "git", "commits", "tokens"]
dependencies: []
conflicts: []
---
<!-- RULEBOOK_TERSE_COMMIT:START -->
# Rulebook Terse Commit

Write commit messages terse and exact. Conventional Commits format. Why over what.

## Subject line

- Format: `<type>(<scope>): <imperative summary>` — `<scope>` optional.
- Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `revert`.
- Imperative mood: "add", "fix", "remove" — not "added", "adds", "adding".
- Target ≤50 chars. Hard cap 72.
- No trailing period.
- Match project capitalization convention after the colon (match the repo's existing history).

## Body

- **Skip the body entirely** when the subject is self-explanatory.
- Add a body ONLY for: non-obvious `why`, breaking changes, migration notes, linked issues.
- Wrap at 72 chars.
- Bullets use `-`, not `*`.
- Reference issues/PRs at the end: `Closes #42`, `Refs #17`.

## Never include

- "This commit does X", "I", "we", "now", "currently" — the diff says what.
- "As requested by ..." — use the `Co-authored-by` trailer instead.
- "Generated with Claude Code" or any AI attribution.
- Emoji (unless project convention requires them).
- Restating the file name when `<scope>` already identifies it.

## Auto-Clarity

Always include a body for:

- **Breaking changes** (`!` suffix on type, plus `BREAKING CHANGE:` footer).
- **Security fixes** (CVE ID when applicable).
- **Data migrations** that touch user data.
- **Reverts** of a prior commit (reference the reverted SHA).
- **Performance regressions fixed** (include before/after numbers when possible).

Terseness is NEVER permitted to obscure these cases — future debuggers need the context.

## Examples

### New endpoint with non-obvious why

```
feat(api): add GET /users/:id/profile

Mobile client needs profile data without the full user payload to
reduce LTE bandwidth on cold-launch screens.

Closes #128
```

### Breaking API change

```
feat(api)!: rename /v1/orders to /v1/checkout

BREAKING CHANGE: clients on /v1/orders must migrate to /v1/checkout
before 2026-06-01. Old route returns 410 after that date.
```

### Simple bug fix — subject only

```
fix(auth): reject expired tokens on boundary second
```

### Revert

```
revert: "feat(api): add GET /users/:id/profile"

This reverts commit a1b2c3d. Endpoint caused 5% latency regression
on the hot path; see incident INC-4219.
```

## Boundaries

Only generates the commit message. Does NOT run `git commit`, does NOT stage files, does NOT amend. Output is a code block ready to paste.

Override: `/rulebook-terse-commit off` or "stop terse commit" reverts to the model's default commit style.

<!-- RULEBOOK_TERSE_COMMIT:END -->
