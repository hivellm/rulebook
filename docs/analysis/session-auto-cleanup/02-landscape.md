# 02 — Landscape: How Famous Tools Clean Sessions Automatically

Researched 2026-07-14. Sources at the end.

## F-004 — Claude Code: three-tier pipeline (the native baseline)

1. **Microcompaction** — bulky tool results are paged to disk early and
   replaced with a ~2 KB preview + file path; the model Reads the full output
   on demand (demand-paging).
2. **Auto-compaction** — at ~83.5% of the window (buffer ~33k tokens) the
   history is summarized into a compaction block. Instant since v2.0.64.
3. **Manual `/compact <focus>`** — compaction at a task boundary with custom
   focus instructions ("preserve the API decisions").

`CLAUDE.md` is re-read every turn and **survives compaction intact** — durable
rules belong there, not in conversation. Community best practice: compact at
~60%, at task boundaries, not at saturation.
**Takeaway for Rulebook**: the pipeline exists and is good; don't rebuild it.

## F-005 — Codex CLI: session-memory first, then server-side compact

Triggers at ~167k/200k tokens (`window − output buffer − margin`). Before
summarizing, a "session memory check" substitutes structured state (task
state, edit history, decisions) without any LLM call; only then calls a
`/responses/compact` endpoint (result is an encrypted blob). Post-compaction it
auto-re-reads up to 5 recently edited files (~50k tokens) — which refills the
window and cascades compactions.
**Takeaway**: structured-state-first is exactly Rulebook's `.rulebook/` model;
the re-read cascade is a warning against aggressive auto-recovery.

## F-006 — OpenCode: selective pruning before summarizing

A `Compress` tool lets the model prune stale tool outputs selectively (only if
it frees >20k tokens), with the most recent 40k tokens protected and skill
outputs never pruned; summaries nest instead of discarding earlier ones.
**Takeaway**: pruning stale tool output beats summarizing everything — this is
what Claude Code's microcompaction now does natively.

## F-007 — Roo Code: threshold slider per model profile

"Intelligent Context Condensing": auto-summarize when
`usage ≥ condensationThreshold` (configurable %, per API profile, custom
condense prompt). Enabled by default.
**Takeaway**: a user-visible threshold knob is the ergonomic baseline users
expect.

## F-008 — Cline: Memory Bank (the famous pattern)

Durable per-workspace markdown (projectBrief, activeContext, systemPatterns,
progress…) that the agent MUST read at every task start; `/newtask` and
`/smol` save context to the bank and start a fresh window. A visual context
progress bar signals pressure.
**Takeaway**: this is Rulebook's own architecture — `.rulebook/` (PLANS, tasks,
knowledge, decisions) + `rulebook_session start` returning everything in one
call IS a Memory Bank with tooling. The missing piece is the *signal* to
rotate sessions.

## F-009 — Aider: background summarization with a weak model

Chat history beyond `max-chat-history-tokens` (default 1–2k) is summarized in
the background by a cheaper model, keeping the working window small
continuously rather than in big compaction events.
**Takeaway**: continuous small summarization trades fidelity for smoothness;
native compaction + durable state covers Rulebook's need without a second
model.

## F-010 — MemGPT/Letta: the research blueprint

Context as virtual memory: **core memory** (always in-window, self-editable),
**recall memory** (searchable conversation history outside the window),
**archival memory** (long-term store), with the agent paging via tool calls.
**Takeaway**: maps 1:1 — core = CLAUDE.md/AGENTS.md, recall = PLANS.md +
git log, archival = `.rulebook/` knowledge/decisions/archive via
`rulebook_memory`.

## Sources

- [Compaction — Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/compaction)
- [Inside Claude Code's Compaction System](https://decodeclaude.com/claude-code-compaction/)
- [Context Compaction Deep Dive: Codex CLI, Claude Code, OpenCode](https://codex.danielvaughan.com/2026/04/14/context-compaction-deep-dive-codex-cli-claude-code-opencode/)
- [Claude Code Context Buffer: The 33K-45K Token Problem](https://claudefa.st/blog/guide/mechanics/context-buffer-management)
- [Automatic context compaction — Claude Cookbook](https://platform.claude.com/cookbook/tool-use-automatic-context-compaction)
- [Intelligent Context Condensing — Roo Code Docs](https://docs.roocode.com/features/intelligent-context-condensing)
- [Memory Bank — Cline Docs](https://docs.cline.bot/best-practices/memory-bank)
- [Cline: context window progress bar](https://cline.bot/blog/understanding-the-new-context-window-progress-bar-in-cline)
- [Aider options reference (max-chat-history-tokens)](https://aider.chat/docs/config/options.html)
- [Virtual context management with MemGPT and Letta](https://www.leoniemonigatti.com/blog/memgpt.html)
- [Agent Memory — Letta](https://www.letta.com/blog/agent-memory/)
- [Customize your status line — Claude Code Docs](https://code.claude.com/docs/en/statusline)
- [Statusline context_window cumulative-tokens bug #13783](https://github.com/anthropics/claude-code/issues/13783)
