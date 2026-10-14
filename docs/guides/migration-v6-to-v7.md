# Migrating from v6 to v7

v7's mission: run **complementary** to modern frontier models (Claude
Opus/Fable) — an assistant, never an anchor. The full analysis and impact
ledger live in `docs/analysis/v7-performance/`.

## Measured impact (fresh default init)

| Metric | v6.0.0 | v7.0.0 |
|---|---:|---:|
| Static context per session | 14,951 tok | **~3,400 tok (−77%)** |
| MCP tools / schema bytes | 26 / 13,965 | **5 / 3,592 (−74%)** |
| Hook entries (full v6 set) | 7 across 5 events | **1 path-only guard** |
| Default install | 95 files | **29 files** |
| On-demand specs | ~29,900 tok | **~2,300 tok (−92%)** |
| Session-start ceremony | 4–5 calls | **1 call** |

## How to migrate

```bash
# See exactly what would change — no files touched
npx @hivehub/rulebook@latest update --dry-run

# Apply
npx @hivehub/rulebook@latest update --yes
```

The update, in one pass:

1. **Regenerates lean context** — CLAUDE.md (~55 lines) and AGENTS.md (<3 KB
   index). `AGENTS.override.md` is never touched and wins on conflict.
   Sentinels are version-tolerant: blocks stamped by any v5/v6 release are
   recognized and replaced in place; content outside them is preserved.
2. **Strips every retired hook** on every event (PreToolUse, PostToolUse,
   PreCompact, SubagentStop, SessionEnd, …) in `.claude/settings.json` and
   `.claude/settings.local.json` — by script name (handoff, terse,
   compact-reinject, update-check, team-enforcement, the old content-regex
   guard) and any rulebook entry whose script file is gone — then wires the
   v7 guards. Entries that do not call a rulebook hook script are never
   touched; each removed entry is listed in the output.
3. **Applies the full-autonomy permission profile** — `defaultMode:
   acceptEdits` + a broad allow list. Additive only: your own permissions and
   an existing `defaultMode` are never removed or tightened.
4. **Moves rulebook-owned retired files to `.rulebook/backup/<timestamp>/`**
   — old always-on rules, v5/v6 agents, generic skills and commands, retired
   hook scripts, retired specs (`quality_enforcement.md`,
   `tier1_prohibitions.md`, …) — and renames spec files to the lowercase
   convention (`rulebook.md`, `quality.md`, …). Ownership is decided by
   content: a hash catalogue of every file each release since v5.0.0
   installed (`src/core/migration/legacy-catalogue.json`, rebuilt from the git
   tags with `npm run build:catalogue`). A file at a rulebook path whose
   content matches no release was edited by you; it stays where it is and the
   output lists it as "edited, kept".
5. **Refreshes the agents and skills rulebook still ships** when they are
   unedited (e.g. an old `implementer.md` gets the current text in the
   project's language); edited copies are kept and reported.
6. **Upgrades `.mcp.json`** to the slim `rulebook-mcp` entrypoint (no CLI
   dependencies in the server process).

## Breaking changes to be aware of

- **MCP tool names changed**: 26 per-verb tools → 6 action-parameterized ones
  (`rulebook_task`, `rulebook_memory`, `rulebook_session`, `rulebook_skill`,
  `rulebook_rules`, `rulebook_workspace`). Example:
  `rulebook_task_create({taskId})` → `rulebook_task({action:"create", taskId})`.
- **Agents and workflows are opt-in**: nothing installs `.claude/agents/` or
  `.claude/workflows/` by default — native harness agents cover the roles.
  Installed copies of the agents rulebook still ships are refreshed; unedited
  agents it no longer ships (v5's 19-agent set) move to `.rulebook/backup/`.
  Shipped agents no longer set `maxTurns` — the harness limits apply.
- **Generic dev skills are opt-in**: only `analysis` and `spec` ship by
  default. Unedited copies of the other generic skills and the
  retired-subsystem skills (terse, handoff) move to `.rulebook/backup/`;
  skills you edited or wrote yourself are kept.
- **Spec filenames are lowercase**: update any hardcoded references to
  `.rulebook/specs/RULEBOOK.md` → `rulebook.md`, etc.
- **Config keys removed**: `handoff` and `terse` sections of `rulebook.json`
  are ignored; `multiAgent.enabled` now only sets the teams feature flag.

## Session hygiene (new in v7)

- Task archive and session end responses include a `contextTip` — right after
  a boundary is the cheapest moment to `/clear` (a fresh v7 session boots in
  ~1.7k tokens of project config).
- The generated statusline shows a context meter (`dir | branch | ctx NN%`).
- Guidance: `/compact <focus>` at ~60% context at a task boundary; durable
  state always lives in `.rulebook/` and git, never only in conversation.
