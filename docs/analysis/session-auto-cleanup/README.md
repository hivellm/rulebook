# Session Auto-Cleanup — Keeping Context From Accumulating

**Date**: 2026-07-14
**Scope**: How Rulebook v7 projects can keep Claude Code sessions lean
automatically, based on how the leading agent tools solve context accumulation.
**Verdict**: Do NOT rebuild the retired v6 handoff (forced Stop-hook + /clear
ritual — F-010). The native harness already ships a three-tier compaction
pipeline; Rulebook's job is to make sessions *cheap to end and cheap to start*
(state on disk, one-call resume) and to surface context pressure through
channels that cost zero hooks: tool responses and the statusline.

## Files

| File | Theme | Findings |
|---|---|---|
| [01-problem.md](01-problem.md) | Why sessions accumulate and what it costs | F-001..F-003 |
| [02-landscape.md](02-landscape.md) | How 7 famous tools solve it (researched) | F-004..F-010 |
| [03-design-for-rulebook.md](03-design-for-rulebook.md) | Options mapped to v7 principles | — |
| [04-execution-plan.md](04-execution-plan.md) | Concrete implementation items | — |

## Executive summary

Every mature agent tool converges on the same architecture — summarize/page
old context automatically, keep durable state OUTSIDE the window, and make
fresh sessions cheap:

- **Claude Code** (native): microcompaction (big tool results paged to disk),
  auto-compact at ~83.5% of the window, manual `/compact <focus>`; CLAUDE.md
  survives compaction. Community best practice: compact at ~60%, at task
  boundaries.
- **Codex CLI**: session-memory substitution first, then a server-side compact
  endpoint at ~167k tokens.
- **OpenCode**: selective pruning of stale tool outputs before summarizing;
  last 40k tokens protected.
- **Roo Code**: auto-condense at a configurable threshold per model profile.
- **Cline Memory Bank**: durable markdown state files + `/newtask` — the
  "fresh session is cheap" philosophy.
- **Aider**: background summarization of old chat history with a weak model.
- **MemGPT/Letta**: the research blueprint — context as virtual memory with
  core/recall/archival tiers.

**Rulebook v7 already IS the Memory Bank**: `.rulebook/` (tasks, PLANS,
knowledge, decisions) + git history + a 1-call `rulebook_session start` that
returns everything. What's missing is *pressure signaling and boundary hygiene*
— telling the model/user, at zero hook cost, when ending the session is cheaper
than continuing. That is the recommendation in
[03-design-for-rulebook.md](03-design-for-rulebook.md).
