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
2. **Strips every retired hook** from `.claude/settings.json` via signatures
   (handoff, terse, compact-reinject, update-check, team-enforcement, the old
   content-regex guard) and wires the single v7 path-only scaffolding guard.
3. **Applies the full-autonomy permission profile** — `defaultMode:
   acceptEdits` + a broad allow list. Additive only: your own permissions and
   an existing `defaultMode` are never removed or tightened.
4. **Removes rulebook-owned retired files** — old always-on rules, retired
   hook scripts, terse/handoff skills, retired spec docs — and renames spec
   files to the lowercase convention (`rulebook.md`, `quality.md`, …).
   Anything without a rulebook generation marker is treated as user-authored
   and left alone (the dry-run lists these as "kept").
5. **Upgrades `.mcp.json`** to the slim `rulebook-mcp` entrypoint (no CLI
   dependencies in the server process).

## Breaking changes to be aware of

- **MCP tool names changed**: 26 per-verb tools → 6 action-parameterized ones
  (`rulebook_task`, `rulebook_memory`, `rulebook_session`, `rulebook_skill`,
  `rulebook_rules`, `rulebook_workspace`). Example:
  `rulebook_task_create({taskId})` → `rulebook_task({action:"create", taskId})`.
- **Agents and workflows are opt-in**: nothing installs `.claude/agents/` or
  `.claude/workflows/` by default — native harness agents cover the roles.
  Your existing installed agents/workflows are not deleted.
- **Generic dev skills are opt-in**: only `analysis` and `spec` ship by
  default. Previously installed generic skills keep working; retired-subsystem
  skills (terse, handoff) are removed since their hooks no longer exist.
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
