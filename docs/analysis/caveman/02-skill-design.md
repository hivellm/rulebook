# 02 — Skill Design

## The skill itself (`skills/caveman/SKILL.md`)

The entire behavioral spec is **under 100 lines of Markdown**. YAML frontmatter + six sections: Persistence, Rules, Intensity, Auto-Clarity, Boundaries. Everything the LLM needs is in this one file.

### Frontmatter — the activation surface

```yaml
name: caveman
description: >
  Ultra-compressed communication mode. Cuts token usage ~75% by speaking like caveman
  while keeping full technical accuracy. Supports intensity levels: lite, full (default),
  ultra, wenyan-lite, wenyan-full, wenyan-ultra.
  Use when user says "caveman mode", "talk like caveman", "use caveman", "less tokens",
  "be brief", or invokes /caveman. Also auto-triggers when token efficiency is requested.
```

Two observations:

- **The `description` is not for humans** — it is read by the model to decide when to self-invoke the skill. Every phrase in the “use when…” clause is a natural-language trigger. The `UserPromptSubmit` hook happens to match the same phrases programmatically, but the model-driven path is the fallback for installs that have no hook support.
- **No versioning in the frontmatter.** The repo uses git history as the version vector. This is appropriate for a skill whose semantics change rarely.

### Persistence

```
ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift.
Still active if unsure. Off only: "stop caveman" / "normal mode".
```

Four uppercased assertions. The problem being solved is a real one: LLMs in long conversations tend to drift back to their default verbose register after 10–20 turns, especially when other system messages or tool results inject formal prose. The per-turn `UserPromptSubmit` reinforcement plus these explicit persistence claims are the defensive layer.

### Rules

The stylistic rules read as a bullet list:

- Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging.
- Fragments OK.
- Short synonyms (big not extensive, fix not “implement a solution for”).
- Technical terms exact. Code blocks unchanged. Errors quoted exact.

The sentence pattern is given as a template: `[thing] [action] [reason]. [next step].`

And then two concrete before/after examples anchor the style for the model. Examples in SKILL.md are not decoration — they are few-shot demonstrations that the model pattern-matches against.

### Intensity levels

Six levels in a compact table:

| Level | What change |
|---|---|
| **lite** | No filler/hedging. Keep articles + full sentences. Professional but tight. |
| **full** | Drop articles, fragments OK, short synonyms. Classic caveman. |
| **ultra** | Abbreviate (DB/auth/config/req/res/fn/impl), strip conjunctions, arrows for causality (X → Y), one word when one word enough. |
| **wenyan-lite** | Semi-classical Chinese. Drop filler/hedging but keep grammar structure. |
| **wenyan-full** | Maximum classical terseness. Fully 文言文. 80–90% character reduction. Classical particles (之/乃/為/其). |
| **wenyan-ultra** | Extreme abbreviation while keeping classical Chinese feel. |

Each level is calibrated against the same worked example (“Why React component re-render?”) so the model can anchor the compression level against a known answer.

The wenyan levels are the most interesting design decision. Classical Chinese is genuinely one of the most token-efficient written languages — the examples in the spec show 80–90% character reduction. The spec treats this as a first-class compression dial, not a gimmick.

### Auto-Clarity — the safety escape hatch

This is the most important rule in the skill:

```
Drop caveman for: security warnings, irreversible action confirmations,
multi-step sequences where fragment order risks misread, user asks to
clarify or repeats question. Resume caveman after clear part done.
```

Why it matters:

- **Security warnings** compressed to fragments are dangerous. “Drop table users. Backup first.” is ambiguous in a way a full sentence isn’t.
- **Destructive operations** — the user needs the full consequences spelled out before approving.
- **User confusion** — if a terse answer is unclear, re-compressing it will just fail again. The fix is to switch register.

The example given in the spec:

> **Warning:** This will permanently delete all rows in the `users` table and cannot be undone.
> ```sql
> DROP TABLE users;
> ```
> Caveman resume. Verify backup exist first.

The verbose warning is verbose **on purpose**. The compression resumes after the hazard is past.

**This pattern generalizes.** Any stylistic directive that compresses output needs an equivalent escape hatch. The two strong candidates for a Rulebook adoption are destructive ops and security advisories.

### Boundaries

```
Code/commits/PRs: write normal. "stop caveman" or "normal mode": revert.
Level persist until changed or session end.
```

Three declarations: (1) generated code is normal (no one-line JSX), (2) there is a named exit, (3) mode is sticky. All three feel obvious and all three are needed.

## Sub-skills

Each sub-skill is a standalone SKILL.md with its own frontmatter and its own activation triggers. None of them share state. This independence lets the Claude Code plugin system load them selectively.

### `caveman-commit`

Generates Conventional Commits messages. Core rules:

- Subject ≤50 chars (hard cap 72).
- No trailing period.
- Imperative mood.
- Body only when non-obvious — breaking changes, migrations, linked issues.
- Never include `I/we/now/currently/this commit does`.
- No AI attribution (“Generated with Claude Code”) in the message body.

Auto-clarity rule: always include a body for breaking changes, security fixes, data migrations, or reverts. Terseness ≠ opacity for future debuggers.

Boundaries: output-only. Does not `git commit`, stage, or amend.

### `caveman-review`

One-line PR comments. Format: `L<line>: <severity> <problem>. <fix>.`

Severity prefixes (optional when mixed):
- 🔴 `bug:` — broken behavior, will cause an incident
- 🟡 `risk:` — works but fragile (race, missing null check, swallowed error)
- 🔵 `nit:` — style, naming, micro-optim (author may ignore)
- ❓ `q:` — genuine question, not a suggestion

Drop: throat-clearing (“I noticed”, “it seems”, “you might want”), per-comment pleasantries, restating what the line does, hedging (use `q:` instead).

Auto-clarity rule: write full paragraphs for security findings (CVE-class bugs need the “why”), architectural disagreements (need rationale), and onboarding contexts. Then resume terse.

Boundaries: review-only. Does not write the fix, approve, or request changes.

### `caveman-help`

One-shot quick-reference card. Not a persistent mode — it displays once and exits. The other skills are stylistic registers; this one is a lookup.

### `caveman-compress` (the input-side companion)

This is a *Python CLI* that runs outside the skill system. It takes a Markdown memory file (`CLAUDE.md`, notes, preferences) and rewrites the prose portions into caveman style, preserving:

- Code blocks (byte-for-byte)
- URLs
- File paths
- Commands
- Headings
- Dates
- Version numbers

Only prose gets compressed. It writes the compressed output to the original path and saves a backup at `<name>.original.md`. Validation is automatic (headings, code blocks, URLs round-trip), with up to two targeted retries on validation failure.

The framing is sharp: *caveman* reduces the tokens the agent **speaks**, *caveman-compress* reduces the tokens the agent **reads** every session. `CLAUDE.md` loads on every session start, so a 46% reduction there is a per-session dividend.

The repo itself dogfoods this: root `CLAUDE.md` is the compressed version, and `CLAUDE.original.md` is the human-readable backup.

## Activation surface summary

| Trigger type | Surface |
|---|---|
| Slash command | `/caveman`, `/caveman lite`, `/caveman ultra`, `/caveman wenyan`, `/caveman-commit`, `/caveman-review`, `/caveman-compress` |
| Natural language (on) | “talk like caveman”, “caveman mode”, “activate caveman”, “less tokens please” |
| Natural language (off) | “stop caveman”, “normal mode”, “deactivate caveman” |
| Model-inferred | Anything matching the `description` field’s use-when clauses |
| Implicit (auto-on) | SessionStart hook on every new session (Claude Code), `GEMINI.md` context, `.cursor/rules/` always-apply, `.windsurf/rules/` always-on |

Redundancy across surfaces is deliberate: different agent systems expose different hook points, and the skill should activate regardless of which ones are wired.

## Design principles worth naming

1. **Rules + examples, no prose theory.** The SKILL.md has zero meta-explanation. It tells the model what to do and shows before/after. No paragraphs explaining *why* — that lives in the README and the project `CLAUDE.md`, not in the skill the model loads.
2. **The escape hatch is a first-class feature, not an afterthought.** Auto-clarity is documented in the skill itself, not in a README footnote. The model learns the compression *and* its exceptions from the same file.
3. **Six levels is enough.** Three intensity levels in Latin script + three in classical Chinese covers the space. No “extra-lite” or “ultra-plus”. Fewer levels means less mode confusion.
4. **Boundaries are explicit.** Code/commits/PRs/SQL written normal. Without this, the skill would corrupt the artifacts it’s supposed to produce.
5. **Skills are monolithic, sub-skills are independent.** No shared state between caveman, caveman-commit, caveman-review. If one is uninstalled, the others still work. If one misbehaves, it doesn’t poison the others.
