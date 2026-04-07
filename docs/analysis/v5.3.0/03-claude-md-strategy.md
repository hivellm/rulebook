# 03 — CLAUDE.md Strategy (per Anthropic Official Docs)

Source: https://code.claude.com/docs/en/memory (fetched 2026-04-07).

## 3.1 Key guidance from Anthropic (direct quotes)

> "**Size**: target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence."

> "CLAUDE.md files can import additional files using `@path/to/import` syntax. Imported files are expanded and loaded into context at launch alongside the CLAUDE.md that references them. … Imported files can recursively import other files, with a maximum depth of five hops."

> "For private per-project preferences that shouldn't be checked into version control, create a `CLAUDE.local.md` at the project root."

> "Claude Code reads `CLAUDE.md`, not `AGENTS.md`. If your repository already uses `AGENTS.md` for other coding agents, create a `CLAUDE.md` that imports it so both tools read the same instructions without duplicating them."

> "Rules without [`paths` frontmatter] are loaded at launch with the same priority as `.claude/CLAUDE.md`. … Path-scoped rules trigger when Claude reads files matching the pattern, not on every tool use."

> "Block-level HTML comments (`<!-- maintainer notes -->`) in CLAUDE.md files are stripped before the content is injected into Claude's context."

## 3.2 Validating the user hypothesis

**Hypothesis:** *CLAUDE.md should be generic across all projects, updated on each `rulebook update`; project-specific state lives in imported files.*

**Verdict: strongly supported**, with three refinements:

1. **CLAUDE.md should be generic *and* thin** — not just generic. The current rulebook-generated CLAUDE.md in project-v (167 lines) is already close to ideal; tml (1021) and UzEngine (355) are evidence of organic drift that rulebook should actively counter.
2. **Use `@import` to pull in the dynamic parts**, not to pull in *everything*. The generic CLAUDE.md should contain: (a) one-paragraph project identity, (b) the imports, (c) a small fixed "critical rules" section (<30 lines). Everything else goes in imported files.
3. **`AGENTS.md` becomes an import target**, exactly as Anthropic suggests. This resolves the 5000–6000-line AGENTS.md problem: AGENTS.md is *fine* being large because it's loaded by reference, but it should itself be split into `.claude/rules/` when feasible.

## 3.3 Proposed file layout (v5.3.0)

```
<project>/
├── CLAUDE.md                    # Generic, regenerated each `rulebook update`. <150 lines.
│                                # Entirely composed of imports and a tiny header.
├── CLAUDE.local.md              # (gitignored) personal overrides. rulebook init adds to .gitignore.
├── AGENTS.md                    # Existing modular AGENTS content. Unchanged in size, but now
│                                # imported by CLAUDE.md via `@AGENTS.md`.
├── AGENTS.override.md           # User-owned. Never touched by rulebook update. (Already exists in v4.0)
├── .claude/
│   ├── CLAUDE.md -> ../CLAUDE.md  (optional; docs say both paths are valid)
│   └── rules/
│       ├── git-safety.md        # Generic, regenerated.
│       ├── no-shortcuts.md      # Generic, regenerated.
│       ├── sequential-editing.md
│       ├── research-first.md
│       ├── follow-task-sequence.md
│       ├── incremental-implementation.md
│       ├── fail-twice-escalate.md   # NEW — from paper finding #6 + UzEngine field data.
│       ├── diagnostic-first.md       # NEW — from paper finding #2 (check-before-test).
│       ├── mcp-tool-reference.md     # NEW — auto-generated from detected MCP servers.
│       └── <language>.md             # Path-scoped (`paths: ["**/*.rs"]`). Auto-generated per detected lang.
└── .rulebook/
    ├── STATE.md                 # Machine-written. Active task, phase, last iteration. Imported by CLAUDE.md.
    ├── PLANS.md                 # Session scratchpad. Imported by CLAUDE.md.
    ├── COMPACT_CONTEXT.md       # Re-injected after compaction (see 05-tml-hooks.md §B.2).
    ├── decisions/               # ADRs. Not imported (browsed on demand).
    ├── knowledge/               # Patterns/anti-patterns. Not imported.
    ├── learnings/               # Ralph learnings. Not imported.
    └── memory/                  # MCP memory. Not imported (queried via MCP).
```

## 3.4 The generic `CLAUDE.md` template (proposed)

Approximately this content (<120 lines), identical across all rulebook-managed projects:

```markdown
<!-- RULEBOOK:START v5.3.0 — DO NOT EDIT BY HAND. Regenerated on `rulebook update`.
     Put project-specific content in AGENTS.override.md or CLAUDE.local.md. -->

# CLAUDE.md

This project is managed by @hivehub/rulebook. The authoritative rules come from the
imports below. Claude Code loads all of them automatically at session start.

## Project identity
@.rulebook/STATE.md

## Core standards (team-shared, versioned)
@AGENTS.md

## Project-specific overrides (user-owned, survives updates)
@AGENTS.override.md

## Session scratchpad
@.rulebook/PLANS.md

## Critical rules (highest precedence)

1. Read `AGENTS.md` and `AGENTS.override.md` before making changes.
2. Never revert or discard uncommitted work — fix forward.
3. Edit files sequentially, not in parallel.
4. Run `check`/type-check before `test` (diagnostic-first).
5. If a fix fails twice, stop and escalate to a team or research.
6. Use MCP tools (`mcp__rulebook__*`) instead of shell where available.
7. Save learnings to `.rulebook/learnings/` at end of significant work.

## Memory
This project uses the Rulebook MCP server for persistent memory across sessions.
Start sessions with `rulebook_memory_search`, end with `rulebook_session_end`.

<!-- RULEBOOK:END -->
```

## 3.5 How `rulebook update` stays safe

1. Parse existing `CLAUDE.md`. If wrapped in `RULEBOOK:START`/`RULEBOOK:END`, the whole block is regenerated.
2. Any content *outside* the block is preserved verbatim (back-compat with v5.2 merger).
3. `AGENTS.override.md` and `CLAUDE.local.md` are **never** written or deleted.
4. `.claude/rules/*.md` files with a `# Generated by rulebook` sentinel are regenerated; files without the sentinel are preserved.
5. `.rulebook/STATE.md` is regenerated from current task state unless it has a `manual: true` frontmatter flag.
6. A pre-update snapshot goes to `.rulebook/backup/<timestamp>/` so any mistake is recoverable.
