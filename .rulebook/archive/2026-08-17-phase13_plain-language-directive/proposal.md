# Proposal: phase13_plain-language-directive

Source: user feedback, 2026-08-17 — replies carry too much jargon and are
longer than they need to be, which makes them hard to follow.

## Why

Rulebook has directives for how an agent *works* (commands, values, git
safety) but none for how it *talks*. Nothing sets a bar for how an answer
reads, so replies drift toward dense terminology and length that the reader
has to decode.

The gap is in the always-on file. `templates/core/claude-md.md` has
`## Commands`, `## Values`, `## Git safety`, `## Orchestration`,
`## Rulebook` — no section on communication. Searching the templates for
`concise`, `succinct`, `jargon`, or `verbose` returns nothing in
`templates/core/`, so this is new ground rather than a rewording.

## What Changes

A short `## Communication` section in `templates/core/claude-md.md`, in the
same clipped style as `## Values`. The rules to encode:

1. Plain words first. Use a technical term when it is the accurate name for
   the thing, not as shorthand that saves the writer effort and costs the
   reader. When a term is unavoidable and not obvious in context, say what it
   means in the same sentence.
2. Lead with the answer, then the reasoning. The reader should not have to
   reach the end to learn the outcome.
3. Keep explanations short. Cut background the reader already has, options
   that were not taken, and restatements of the request.
4. Length follows the work, not the effort spent. A large investigation with
   a simple result gets a short answer.

Scope note: this is a general rule that every project using rulebook
inherits, so it belongs in the shared template — not in this repo's
`AGENTS.override.md`. Confirm with the user if the intent was local-only.

## Impact

- Affected specs: none (`.rulebook/specs/` mirrors `AGENTS.md` sections, not
  the CLAUDE.md communication block — verify during implementation)
- Affected code: `templates/core/claude-md.md`, generated `CLAUDE.md`,
  generator tests, `CHANGELOG.md`
- Breaking change: NO — additive directive text
- User benefit: answers that are readable on the first pass
- Budget: always-on is 1,678 of 2,500 tokens. This section must stay small
  enough to keep `scripts/measure-overhead.mjs` green alongside phase12,
  which also adds always-on text.
