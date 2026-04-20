# 04 — Findings for Rulebook

This report is the actionable output. Each finding is either a pattern Rulebook should adopt, an anti-pattern to avoid, or an open question the Caveman project raises but does not answer.

## Patterns to adopt

### P1 — Single source of truth + CI fan-out for cross-agent distribution

**What Caveman does.** Two human-edited files (`skills/caveman/SKILL.md`, `rules/caveman-activate.md`) expand to 9+ agent-specific files via a GitHub Actions workflow on every push to `main`. Synced files are marked do-not-edit in a table at the top of `CLAUDE.md`.

**Why it matters for Rulebook.** Rulebook today ships primarily for Claude Code. When it starts shipping for Cursor / Windsurf / Cline / Copilot / 40+ agents via `npx skills`, the combinatorial maintenance cost of keeping per-agent rule files in sync becomes unworkable unless CI enforces it.

**Adoption recipe.**
- Designate `.rulebook/specs/*.md` (or equivalent) as the only human-edited source.
- Write a sync workflow that fans out to each agent’s drop point with the right frontmatter.
- Commit back with `[skip ci]`.
- Put a source-of-truth table in the top-level `CLAUDE.md`.

### P2 — Hidden SessionStart injection

**What Caveman does.** The SessionStart hook’s stdout is injected into the model’s context invisibly — the user never sees the caveman ruleset get loaded, but the model does. Per-turn reinforcement via `UserPromptSubmit` prevents drift without re-injecting the full ruleset every turn.

**Why it matters for Rulebook.** Rulebook already has rules it injects every session. Today some of these surface visibly. Invisible injection via hook stdout produces a cleaner UX and avoids cluttering the user’s transcript.

**Adoption recipe.**
- For rules the model must follow but the user doesn’t need to see: move them from `CLAUDE.md` (visible) to a SessionStart hook stdout (invisible).
- Reserve `CLAUDE.md` for project state and visible context.
- For persistent modes, add a small per-turn attention anchor via `UserPromptSubmit`.

### P3 — Auto-clarity as a first-class escape hatch

**What Caveman does.** Any directive that compresses output carries an explicit list of situations where the compression is dropped: security warnings, destructive-op confirmations, multi-step sequences where fragment order matters, user confused or repeating question.

**Why it matters for Rulebook.** Rulebook has many directives that constrain output (terseness, no-emoji, conventional commits). Each one needs an equivalent escape clause, or eventually a compressed security warning is going to cause a real incident.

**Adoption recipe.**
- Audit every stylistic directive in `AGENTS.md` and `.rulebook/specs/`.
- Add a named “Auto-clarity” subsection where the directive is dropped for dangerous contexts.
- Name the contexts explicitly: destructive ops, security warnings, user confusion.

### P4 — Three-arm evaluation harness

**What Caveman does.** Baseline / terse / skill — honest delta is skill vs terse, not skill vs baseline. Snapshots committed; measurement offline with `tiktoken`.

**Why it matters for Rulebook.** Rulebook has no consistent way to measure whether a rule or skill is actually doing work. Comparing to a no-skill baseline would conflate the skill’s effect with the effect of asking for brevity at all.

**Adoption recipe.**
- Add an `evals/` directory under Rulebook.
- Every skill / rule file gets evaluated against all three arms.
- Commit snapshots; CI runs offline measurement only.
- A skill whose lift over the terse arm is negligible should be deleted or merged.

### P5 — Silent-fail hooks with symlink-safe writes

**What Caveman does.** Every filesystem operation in every hook is wrapped in try/catch that swallows errors. `safeWriteFlag()` uses `lstat` → refuse if symlink, `O_NOFOLLOW` on open, atomic temp + rename, `0600` perms.

**Why it matters for Rulebook.** Rulebook’s hooks today can crash on edge cases (broken settings.json, readonly filesystem, locked flag file) and crash blocks session start. Also, any hook that writes to a predictable user-owned path is vulnerable to symlink-clobber attacks from a local unprivileged process with write access to that directory.

**Adoption recipe.**
- Audit every Rulebook hook. Wrap every filesystem call in try/catch with silent fail.
- Introduce a `safeWriteFlag()` equivalent in a shared module.
- Never hardcode `~/.rulebook` — honor an env var (e.g. `RULEBOOK_CONFIG_DIR`).

### P6 — CommonJS marker in hook directories

**What Caveman does.** `hooks/package.json` is literally `{"type": "commonjs"}`. It pins the directory so `.js` hooks resolve as CJS even when an ancestor `package.json` declares `"type": "module"`.

**Why it matters for Rulebook.** Any Rulebook `.js` hook currently relying on `require()` will crash if the user has another plugin with an ESM `package.json` higher up the tree (`~/.claude/package.json` is a known offender). This is a one-line fix that prevents an obscure and infuriating failure mode.

**Adoption recipe.** Ship a `{"type": "commonjs"}` marker in every Rulebook hook directory that uses `require()`. Or migrate to ESM. Either way, make the resolution explicit.

### P7 — Dogfooding via repo `CLAUDE.md` compression

**What Caveman does.** The repo’s root `CLAUDE.md` is compressed with caveman-compress. A `CLAUDE.original.md` sits alongside as the human-editable backup.

**Why it matters for Rulebook.** Rulebook is the ideal project to dogfood itself. The compressed `CLAUDE.md` loads on every session, so any reduction there is a per-session dividend.

**Adoption recipe.** Once Rulebook has a compression skill or equivalent, compress its own `CLAUDE.md` and commit the `.original.md` as a backup.

### P8 — Redundant activation surfaces

**What Caveman does.** Slash commands, natural-language triggers, model-inferred triggers (via the `description` frontmatter), implicit auto-on from agent-specific rule systems — all four paths activate the same skill.

**Why it matters for Rulebook.** Different agents expose different hook surfaces. A rule that only fires on a slash command is invisible to a user who expected natural language.

**Adoption recipe.** For every Rulebook skill, ship at least three activation paths: slash command, natural-language trigger documented in the `description` field, and implicit auto-on for agents that support it.

## Anti-patterns to avoid

### A1 — Compressing the guidance the model has to read

Caveman compresses the **output the model produces**. It does *not* compress the SKILL.md the model reads. The SKILL.md is full sentences with examples — because the model learns better from full prose than from caveman prose. A Rulebook temptation would be to compress the specs themselves for smaller context. Don’t — you would be training the model to follow compressed rules *and* produce compressed output, which confuses the stylistic register.

### A2 — Treating stars as validation of the technical work

Caveman has 40k stars. Most of those are for the meme (“why use many token when few do trick”). The *technical* value is real, but the signal should be the benchmarks, the evals, and the hook hardening — not the star count. Rulebook should evaluate Caveman on what it actually ships, not the virality.

### A3 — Hardcoding `~/.claude` anywhere

Caveman deliberately honors `CLAUDE_CONFIG_DIR` everywhere: hooks, installers, statusline scripts. Any Rulebook code that assumes `~/.claude` / `~/.rulebook` is wrong — users with non-default config dirs will see hooks silently do the wrong thing.

### A4 — Letting CI loop on its own commits

Caveman’s sync workflow commits back to `main` after every sync. Without `[skip ci]` on the auto-commit, each sync would trigger the workflow again. This is trivial to forget and infuriating to debug.

## Open questions Caveman raises but does not answer

### Q1 — How do compression styles compose?

Caveman cannot be combined with another stylistic skill (e.g. “always use bullet points”) without collision. The Boundaries section says code/commits/PRs stay normal, but there is no systematic story for “two style skills active at the same time.” Rulebook will hit this — a terseness skill + a style guide + a commit skill all modify output.

### Q2 — How does caveman-compress validate semantic equivalence?

The validator checks that headings, code blocks, URLs, file paths, commands survive byte-for-byte. It does **not** check that the compressed prose preserves meaning. A compression that drops a `not` or flips a causality is currently invisible to the validator. This is an acceptable limitation for an opt-in tool, but Rulebook needs a stronger validator if it compresses project-critical docs automatically.

### Q3 — How do the wenyan levels handle code-switching?

The wenyan levels drop into classical Chinese for prose but keep English technical terms (`useMemo`, `connection`, `handshake`). The SKILL.md shows examples but doesn’t specify the code-switching rules. Worth studying before adopting a multilingual compression tier.

### Q4 — What happens when the flag file is on a network filesystem?

`safeWriteFlag`’s atomic rename is only atomic on local filesystems. SMB/NFS behavior differs. Caveman silent-fails, which is safe but opaque. Rulebook could do better with a platform-specific fallback.

## Summary table

| # | Finding | Type | Effort to adopt in Rulebook |
|---|---|---|---|
| P1 | SSOT + CI fan-out | Pattern | Medium — needs workflow + sync script |
| P2 | Hidden SessionStart injection | Pattern | Low — repurpose existing hook stdout |
| P3 | Auto-clarity escape hatch | Pattern | Low — spec edits, no code |
| P4 | Three-arm eval harness | Pattern | Medium — new directory + Python harness |
| P5 | Silent-fail + symlink-safe hooks | Pattern | Low — one shared module |
| P6 | CommonJS marker | Pattern | Trivial — one-line file |
| P7 | Dogfood compression on own `CLAUDE.md` | Pattern | Low — once compression exists |
| P8 | Redundant activation surfaces | Pattern | Low — spec edits |
| A1 | Compressing the model’s rules file | Anti-pattern | Avoid |
| A2 | Star count as validation | Anti-pattern | Avoid |
| A3 | Hardcoded `~/.claude` / `~/.rulebook` | Anti-pattern | Fix where present |
| A4 | Non-`[skip ci]` auto-sync commits | Anti-pattern | One-line fix |

The top three to move on first, ordered by lift-per-effort: **P6** (trivial), **P3** (spec-only edits), **P5** (one shared module, big safety gain).
