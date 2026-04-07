# 09 — Open Questions (require user decision)

1. **Should CLAUDE.md live at `./CLAUDE.md` or `./.claude/CLAUDE.md`?** Anthropic supports both. tml, project-v, UzEngine all use `./CLAUDE.md`. **Recommendation:** keep `./CLAUDE.md` for backward compatibility and because AGENTS.md also lives at root.

2. **Should `AGENTS.md` itself be split?** It's currently 5000–6000 lines in 2 of 3 projects. Anthropic's budget applies to CLAUDE.md specifically; AGENTS.md is loaded by reference, so the budget is softer. **Recommendation:** leave AGENTS.md as-is for v5.3.0, revisit in v5.4.

3. **Telemetry (F10): opt-in or not shipped at all?** Feature has privacy implications even when local. **Recommendation:** ship opt-in default-off, but decide if the MCP tool surface should expose it or only the CLI.

4. **`.claude/rules/` language templates — how many to ship?** Currently rulebook supports 28 languages. Writing 28 path-scoped rule files is a large authoring task. **Recommendation:** ship the top 8 (TS, JS, Rust, Python, Go, C++, Java, C#) in v5.3.0; add more in point releases.

5. **UzEngine's `.claude/hooks/` and `statusline.sh` — preserve only, or also generate?** **Recommendation for v5.3.0:** preserve only. Generation is out of scope.

6. **Does the CLAUDE.md regeneration need a `--dry-run` preview before overwriting?** **Recommendation:** yes, mandatory for the migration run, optional after.

7. **Should `STATE.md` include Ralph iteration count + last quality gate status?** **Recommendation:** yes — it's cheap and closes the loop with Ralph.

8. **Sub-agent (`.claude/agents/`) support — just preserve, or also generate defaults?** UzEngine proves the pattern scales. **Recommendation:** preserve-only in v5.3.0, evaluate generation in v5.4.

9. **`/analysis` task materialization (F-NEW-4):** auto-spawn tasks from execution plan, or require `--materialize` confirmation? **Recommendation:** gated default — generate plan, prompt, then materialize on confirm.

10. **F-NEW-2 reconsideration (downgrade?):** the official Anthropic memory docs (fetched 2026-04-07) state literally: *"CLAUDE.md fully survives compaction. After `/compact`, Claude re-reads your CLAUDE.md from disk and re-injects it fresh into the session."* This means `@imports` (which are part of CLAUDE.md at runtime) are also automatically re-loaded after compaction. The original problem F-NEW-2 was solving — losing critical context after compaction — is **already solved natively by Claude Code**. **Recommendation:** downgrade F-NEW-2 from P0 to P2 or cancel entirely. Keep `COMPACT_CONTEXT.md` only if there is a value-add beyond what CLAUDE.md re-injection already provides (e.g. a much shorter cheat-sheet for token-budget reasons). The TML hook that inspired F-NEW-2 was written before this Anthropic guarantee was documented, and likely predates the current behavior.
