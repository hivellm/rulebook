## 1. Implementation
- [x] 1.1 Create `src/skills/compress/validator.ts` with invariants (headings, code fences, URLs, paths, commands, dates, versions)
- [x] 1.2 Create `src/skills/compress/compressor.ts` with prose rewriter + 2-retry budget
- [x] 1.3 Create `src/skills/compress/cli.ts` with 4 subcommands (compress, --dry-run, --restore, --check)
- [x] 1.4 Wire backup-to-`.original.md` + atomic rewrite
- [x] 1.5 Register `rulebook compress` subcommand in `src/cli/commands/`
- [x] 1.6 Dogfood: compress `templates/core/CLAUDE.md`, verify round-trip validators pass

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update or create documentation covering the implementation
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass

## Implementation notes

Files created under `src/core/compress/` (not `src/skills/compress/` as the
original proposal anticipated) to match Rulebook's existing convention where
business logic lives under `src/core/` and CLI entry points under
`src/cli/commands/`.

Dogfood target adjusted: `templates/core/CLAUDE.md` does not exist in the
repo (only `templates/core/CLAUDE_MD_v2.md` does — the CLAUDE.md template).
The real dogfood was end-to-end CLI round-trip on a fluff-heavy fixture:
19% savings, validator OK, backup + restore verified. Rulebook's own memory
files (AGENTS_LEAN.md, TOKEN_OPTIMIZATION.md, README files under docs/) are
already lean enough that the deterministic compressor reports ~0% savings —
the validator still passes, confirming it's safe to run against them.

The compressor is deterministic and conservative — it handles filler words,
leading pleasantries, redundant phrase replacements, and hedging removals
only. An LLM-backed rewriter could be layered behind the same validator in
a future phase.
