# 02 — Behavioral Conflicts: How v6 Fights Modern Models

The per-call numbers in [01](01-measured-overhead.md) are secondary. The primary
slowdown is **behavioral**: v6's rules were designed circa weaker models that
needed guardrails against losing context, hallucinating APIs, and wandering
off-task. Frontier models (Fable 5, Opus 4.x) ship with native planning, native
parallel tool use, native context compaction, native verbosity control, and
native subagent orchestration. v6's guardrails now *conflict* with those
capabilities.

## F-005 — 10–14 ceremonial model turns per task

**Evidence**: CLAUDE.md + AGENTS.md task workflow. For a task as small as a
one-line fix, the rules mandate:

```
session_start → read PLANS.md → knowledge_list → learn_list → decision_list
→ read specs/RULEBOOK.md (~30k tok) → task_create → implement
→ task_update (×N) → mark [x] (×N) → knowledge_add → learn_capture
→ task_archive → session_end
```

Each MCP call is a **full model turn**: tool call + result + reasoning ≈ seconds
of inference and hundreds-to-thousands of tokens. The ceremony around a 5-minute
fix can exceed the fix itself by 2–4×. *This — not hook latency — is what users
feel as "Rulebook is slow".*
**Impact**: critical.
**Confidence**: high.

## F-006 — v6 blocks the native subagent fan-out that Fable uses as a core working style

**Evidence**: `templates/hooks/enforce-team-for-background-agents.sh` **denies**
any background `Agent` call without `team_name`;
[claude-settings-manager.ts](../../../src/core/claude/claude-settings-manager.ts)
wires it on PreToolUse `Agent`; AGENTS.md mandates "Never implement directly in
the main conversation when an agent fits" plus a fixed delegation table
(implementation → implementer, research → researcher, …).

Fable-class models dispatch **parallel background subagents for independent
sub-tasks natively** — it is how they decompose multi-part work. v6 punishes
exactly this: the hook denies the dispatch (deny → retry → reformulate as a Team
= 2–3 wasted turns), and the delegation table forces round-trips for work the
main model could do immediately with context it *already has*. Every forced
delegation = spawn + subagent re-reading the same files + report-back +
reconciliation: a **2–5× wall-clock multiplier** on small/medium tasks.
**Impact**: critical — this is the single clearest "anchor" behavior in v6.
**Confidence**: high.

## F-007 — Sequential-editing and decomposition rules forbid native parallelism

**Evidence**: `.claude/rules/sequential-editing.md` ("NEVER batch-read multiple
files then batch-edit"), `.claude/rules/task-decomposition.md` ("STOP — report
back with the decomposition" for 3+ file tasks). These directly contradict the
harness's own guidance to run independent tool calls in parallel, and slow
multi-file refactors that modern models execute reliably in one pass.
**Impact**: high.
**Confidence**: high.

## F-008 — Rules duplicated 2–3× and mutually contradictory

**Evidence**: Karpathy guidelines ×2 (CLAUDE.md + AGENTS.md),
full-task-no-questions ×3 (CLAUDE.md + AGENTS.override.md + rules/),
delegation ×3, task workflow ×3, session continuity ×3. Direct contradictions:

| Rule A | Rule B (contradicts) |
|---|---|
| "Execute the full task in one turn, never stop" | task-decomposition: "STOP — report back with the decomposition" |
| "Delegate by default, never implement in main thread" | "Surgical changes, minimum code, touch only what you must" |
| "Parallelize independent work aggressively" | "Sequential file editing, never batch" |
| "No questions mid-task" | "If something is unclear, stop and ask" |
| "Simplicity first, no abstractions" | Mandatory skills/agents/teams scaffolding for repeated work |

A model burning reasoning tokens reconciling its own rulebook is pure waste, and
contradictions measurably reduce compliance with the rules that matter (git
safety, quality gates).
**Impact**: high.
**Confidence**: high.

## F-009 — Content-regex enforcement produces false-positive denials

**Evidence**: `enforce-pre-tool.sh` denies any source write whose content matches
`/\bplaceholder\b|\bstub\b/i` or TODO/FIXME/HACK in comments. Legitimate code
that trips it:

- `<input placeholder="Search…">` — standard HTML/JSX attribute
- Test doubles literally named *stub* (`sinon.stub()`, `createStub…`)
- Code that *processes* those markers (linters, the hook itself)
- "skip" in tasks.md ("skip-navigation link", "skipList")

Every false deny costs a full recovery turn and teaches the model to **rewrite
correct code to dodge a regex** — the worst outcome for both speed and quality.
**Impact**: high.
**Confidence**: high.

## F-010 — Obsolete subsystems duplicate what the harness now ships natively

**Evidence**:

| v6 subsystem | Modern harness native equivalent |
|---|---|
| Handoff at 75% + Stop hook + /clear ritual | Native context summarization/compaction |
| rulebook-terse (2 hooks + 3 skills) | Native verbosity control & output style |
| Teams enforcement hook | Native teammate/SendMessage support |
| 12 generic agents (researcher, implementer, tester…) | Native general-purpose, Explore, Plan, code-reviewer agents |
| Generic skills (debug, refactor, perf, review, security-audit…) | Native /code-review, /simplify, /verify, deep-research |
| Token-optimization tier tables | Model/effort selection in the harness |
| COMPACT_CONTEXT re-inject hook | Native compaction carries context forward |

The handoff system deserves emphasis: killing a session at 75% throws away a warm
cache and in-context knowledge exactly when the model is most productive, forcing
a cold restart that re-pays the full ~15k-token boot cost.
**Impact**: high.
**Confidence**: high.
