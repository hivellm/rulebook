---
name: "Rulebook Terse Review"
description: "Ultra-compressed code review comments. One line per finding: location, problem, fix. Use when user says 'review this PR', 'code review', 'review the diff', or invokes /rulebook-terse-review. Independent of the base rulebook-terse mode."
version: "1.0.0"
category: "core"
author: "Rulebook"
tags: ["core", "review", "tokens"]
dependencies: []
conflicts: []
---
<!-- RULEBOOK_TERSE_REVIEW:START -->
# Rulebook Terse Review

Write code-review comments terse and actionable. One line per finding. Location, problem, fix. No throat-clearing.

## Format

```
L<line>: <severity> <problem>. <fix>.
```

For multi-file diffs:

```
<file>:L<line>: <severity> <problem>. <fix>.
```

## Severity prefixes

Use when mixing severities in the same review. Optional when all findings are the same severity.

| Prefix | Meaning |
|--------|---------|
| 🔴 `bug:` | Broken behavior; will cause an incident. |
| 🟡 `risk:` | Works but fragile (race, missing null check, swallowed error, unvalidated input). |
| 🔵 `nit:` | Style, naming, micro-optim. Author can ignore without consequence. |
| ❓ `q:` | Genuine question, not a suggestion. |

## Drop

- Throat-clearing: "I noticed that...", "It seems like...", "You might want to consider...".
- Per-comment pleasantries: "Great work!", "Looks good overall but...". Say it once at the top of the review, not per comment.
- Restating what the line does — the reviewer can read the diff.
- Hedging: "perhaps", "maybe", "I think". If unsure, use `❓ q:`.
- "This is just a suggestion but..." — use `🔵 nit:` instead.

## Keep

- Exact line numbers.
- Exact symbol, function, and variable names in backticks.
- A concrete fix, not "consider refactoring this".
- The `why` if the fix isn't obvious from the problem statement.

## Examples

### ❌ Verbose

> "I noticed that on line 42 you're not checking if the user object is null before accessing the email property. This could potentially cause a crash if the user is not found in the database. You might want to add a null check here."

### ✅ Terse

```
L42: 🔴 bug: user can be null after .find(). Add guard before .email.
```

---

### ❌ Verbose

> "It looks like this function is doing a lot of things and might benefit from being broken up into smaller functions for readability."

### ✅ Terse

```
L88-140: 🔵 nit: 50-line fn does 4 things. Extract validate/normalize/persist.
```

---

### ❌ Verbose

> "Have you considered what happens if the API returns a 429? I think we should probably handle that case."

### ✅ Terse

```
L23: 🟡 risk: no retry on 429. Wrap in withBackoff(3).
```

## Auto-Clarity

Drop terse mode and write full prose for:

- **Security findings** (CVE-class bugs, auth bypass, credential exposure) — need full explanation + CWE or CVE reference.
- **Architectural disagreements** — need rationale, not a one-liner.
- **Onboarding contexts** where the author is new to the codebase — they need the `why`, not just the `what`.

In those cases, write a normal paragraph, then resume terse for the remaining comments.

## Boundaries

Review-only. Does NOT:

- Write the code fix.
- Approve or request changes on the PR.
- Run linters or tests.

Output is the comment(s), ready to paste into the PR review UI.

Override: `/rulebook-terse-review off` or "stop terse review" reverts to the model's default review style.

<!-- RULEBOOK_TERSE_REVIEW:END -->
