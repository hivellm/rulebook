# Proposal: phase5_rule-sync-ci-fanout

Source: docs/analysis/caveman/01-architecture.md

## Why

Rulebook targets Claude Code, Cursor, Windsurf, Cline, Copilot, Codex, and 40+ others via `npx skills`. Each agent has its own rule-file location with its own frontmatter requirements (Cursor needs `alwaysApply: true`, Windsurf needs `trigger: always_on`, Cline needs no frontmatter). Today the per-agent projection happens at `rulebook init`/`update` time. Caveman's pattern is stronger: one source of truth, CI fans out on every push to `main`. This guarantees the synced files are always current and marks them do-not-edit by convention.

## What Changes

- `.github/workflows/sync-rules.yml` — triggers on pushes to `main` touching `templates/rules/**` or `templates/skills/**`. Fans out each source file to every agent-specific location, prepending agent-specific frontmatter. Commits back with `[skip ci]`.
- Extend `CLAUDE.md` + top-level `AGENTS.md` with a source-of-truth table: which files are edit-only, which are auto-synced (do-not-edit).
- No change to `rulebook init`/`update` flow for users — projection still happens at install time for existing projects on older versions.

## Impact

- Affected specs: `.rulebook/specs/RULEBOOK.md` (MODIFIED — document CI fan-out)
- Affected code: `.github/workflows/sync-rules.yml` (new)
- Breaking change: NO
- User benefit: Agent-specific files always in sync; zero drift between source and projection.
