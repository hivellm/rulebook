# 01 — The Problem: Sessions Accumulate

## F-001 — Long sessions get slower every turn, before any limit is hit

**Evidence**: the v7 rework session itself. After ~12 phases of work in one
session, every turn reprocesses the full accumulated history (prefill) before
the first token of thinking streams. The user perceives this as "thinking is
slow". No local config changes this — it is proportional to context length.
**Impact**: high — the cost is paid on EVERY turn, compounding.
**Confidence**: high (observed directly; also the premise behind every tool in
[02-landscape.md](02-landscape.md)).

## F-002 — Native auto-compact fires late, and compaction ≠ free

**Evidence**: Claude Code auto-compaction triggers at ~83.5% of the window
(with a ~33k-token reserved buffer, per 2026 builds). Community guidance is to
compact at ~60% at a natural task boundary instead of waiting — late compaction
means many slow turns before relief, and the summary loses more nuance the
bigger the history. Compaction itself costs an LLM call plus cache
invalidation (the whole rebuilt context re-prefills).
**Impact**: medium-high.
**Confidence**: high (documented behavior + measured UX).

## F-003 — The v6 answer (forced handoff) was worse than the problem

**Evidence**: v6 wired a Stop hook on EVERY turn that estimated context from
transcript size and, at 90%, BLOCKED the model until it wrote a handoff file
and told the user to /clear (F-010 in docs/analysis/v7-performance/). It ran
per-turn latency for a once-per-session event, fired at the worst moment
(warmest cache), and fought the native compaction that has since improved.
Any v7 mechanism must not reintroduce hot-path hooks or forced rituals.
**Impact**: design constraint (P0 + zero-hot-path-hooks).
**Confidence**: high (retired subsystem, measured in the v7 analysis).
