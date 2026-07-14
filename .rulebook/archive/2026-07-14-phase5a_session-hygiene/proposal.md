# Proposal: phase5a_session-hygiene

Source: docs/analysis/session-auto-cleanup/

## Why

Long sessions accumulate context and every turn reprocesses it (F-001);
native auto-compact fires late at ~83.5% (F-002); the v6 answer — a forced
Stop-hook handoff — was retired for good reasons (F-003). The industry
converges on cheap session rotation + pressure signals (Cline Memory Bank,
Claude Code /compact-at-60%). Rulebook owns the natural cleanup moments (task
archive, session end) and can signal there at zero hook cost.

## What Changes

- `rulebook_task {action:"archive"}` and `rulebook_session {action:"end"}`
  responses carry a `contextTip`: state is saved, /clear now is cheapest
  (~1.7k-token fresh boot), /compact <focus> to continue.
- Generated statusLine gains a context meter: `dir | branch | ctx NN%` from
  the statusline stdin JSON (`context_window.used_percentage`), pure sh/sed,
  degrades gracefully when absent.
- Generated CLAUDE.md gains one durable guidance line (survives compaction):
  compact at ~60% at task boundaries; /clear is free after archive.
- Bug found while dogfooding: mergeClaudeMd's block-replacement regex had
  v5.3.0 hardcoded — v7-stamped files silently stopped updating. Fixed with a
  version-tolerant regex + regression test.

## Impact

- Affected specs: none (behavioral additions documented in the analysis)
- Affected code: src/mcp/tools/v7-tools.ts, claude-settings-manager.ts,
  templates/core/claude-md.md, src/core/merger.ts
- Breaking change: NO (additive; merger fix restores intended behavior)
- User benefit: sessions stop accumulating by default habit — pressure is
  visible in the statusline and rotation is suggested exactly when it is free
