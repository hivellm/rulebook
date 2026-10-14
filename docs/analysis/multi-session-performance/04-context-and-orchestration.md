# 04 — Context, orchestration and where session time goes

Sessions measured: Rulebook `264d93f8`, Synap `468e3371` (split at its 6.0→7.4 upgrade on
2026-10-13 05:54Z), ar-v3-dashboard `c442b5f4` + `8d0d1c44`, UzPainter `06e8fc50`, Assets3D
`2b88ca18`. Controls without the v7.4 hooks or the delegation mandate: Vectorizer `9c057861`
(7.0.1 phase) and ar-v3-farol `7a28512c` (7.1.0). Cross-session token figures cover 775 subagent
transcripts and 1,179 operator-prompt episodes since 2026-09-01. All time figures are **active
time**: wall time minus operator idle gaps over 60 s, permission waits and dormant gaps.

## A. Where the time goes

### F-020 — In v7.4 sessions the main session spends 66–94 % of active time waiting on subagents

- **Evidence:** per-session timeline partition (each interval attributed to the event that ends it;
  Agent busy time = async launch or SendMessage → matching task notification). Scripts
  `analyze.js`, `hops.js` in the session scratchpad `work/` folder.
- **Numbers:**

  | Session | Waiting on subagents / active | Main-thread model time |
  |---|---:|---:|
  | Rulebook (7.4) | 1.87 of 2.06 h (91 %) | 0.17 h |
  | UzPainter (7.4) | 47.17 of 50.02 h (94 %) | 2.06 h |
  | Synap after 7.4 | 4.13 of 5.51 h (75 %) | 0.53 h |
  | ar-v3-dashboard 8d0d (7.4) | 4.94 of 7.46 h (66 %) | 0.78 h |
  | Synap before 7.4 (6.0) | 0 | 0.91 h model + 0.60 h tools (100 %) |
  | Farol control (7.1) | 0 | 2.86 h model + 1.19 h tools of 4.35 h |

  Subagent busy segments p50/p90: Rulebook 295/809 s, Synap 489/1,017 s, UzPainter 1,069/5,080 s.
- **Impact:** the work runs inside subagents, so this is not pure overhead. But the mandate turns every
  request, small ones included, into launch → wait → hand-back, and the operator sees nothing while it runs.
- **Confidence:** high. **Rulebook-attributable:** partly (the mandate is rulebook's; inference time is not).

### F-021 — Delegation ceremony takes 51–86 % of the main session's own model time

- **Evidence:** generation time of assistant messages that carry Agent/SendMessage calls, plus model
  time on turns triggered by hand-backs (`analyze.js`, `hops.js`).
- **Numbers:** Rulebook: 192 s writing 20 briefs (p50 10.5 s, 2,589 chars) + 309 s on 22 hand-back
  turns, of 603 s total main model time. UzPainter: 1,970 s briefs + 4,034 s on 656 hand-back
  requests (275 M cache-read tokens) of 7,400 s. Dispatch latency from hand-back to next dispatch,
  p50/p90: Rulebook 15/138 s, Synap 14/357 s, UzPainter 39/408 s. Subagent start to first response
  p50 2.5–4.0 s.
- **Impact:** each hop in a dependent chain pays ~3–4 s startup plus 6–39 s (p90 up to ~7 min) of
  main-thread turnaround. Over UzPainter's 67 h session that is ~1.7 h of pure orchestration model time.
- **Confidence:** medium (brief and hand-back time overlap, so 86 % is an upper bound).
  **Rulebook-attributable:** partly.

### F-022 — Small fixes cost 3.5–5.9× more model calls and 1.8–3.1× more wall time when delegated

- **Evidence:** 1,179 operator-prompt episodes since 2026-09-01 (`episodes.cjs`,
  `episodes-summary.cjs`); confirms v7.0 finding F-006 in `docs/analysis/v7-performance/02-behavioral-conflicts.md`.
- **Numbers (p50):**

  | Edits in the episode | Direct: calls / tokens / wall | Delegated: calls / tokens / wall | Ratio |
  |---|---|---|---|
  | 1–3 | 16 / 909 k / 7.0 min (n=246) | 56 / 1.53 M / 12.9 min (n=21) | 3.5× / 1.7× / 1.8× |
  | 4–10 | 44 / 2.19 M / 22.0 min (n=121) | 95 / 2.51 M / 33.2 min (n=34) | 2.2× / 1.1× / 1.5× |
  | 11–30 | 78 / 4.05 M / 44.5 min (n=76) | 135 / 3.94 M / 43.7 min (n=38) | ≈ 1× |

  v7.4 only, 1–5 edits: direct 11 calls / 4.1 min vs delegated 65 calls / 12.9 min (5.9× / 3.1×).
  44 % of v7.4 spawns (243 of 557) made 0–3 edits.
- **Impact:** the rule "delegate every task, including small ones" applies the worst multiplier to the
  most common request size. Break-even is around 11–30 edits.
- **Confidence:** medium (small delegated sample, selection bias). **Rulebook-attributable:** yes.

### F-023 — A one-line fix needs ~10–12 model turns and 1 spawn under v7.4, against 4–5 done directly

- **Evidence:** `CLAUDE.md` Orchestration and Commands sections; `.rulebook/specs/orchestration.md`
  §1 ("Delegate every task to a subagent — including small ones"), §4 ("Read the subagent's report,
  never the files"), §7 (review diff, update CHANGELOG, commit).
- **Numbers:** gate → plan + brief (1) → subagent cold start, read, edit, type-check, lint, tests,
  report (4–6) → read report (1) → review diff (1) → CHANGELOG (1–2) → commit (1–2) → reply (1).
  Measured p50 ratio 5.9× calls. No main session in 30 v7.4 sessions ever read the orchestration spec.
- **Contradictions in the same prompt:** "read reports, not files" vs "review its diff"; "never edit
  code" vs main-session CHANGELOG edits and commits (12 CHANGELOG and 61 task-file edits by main
  sessions observed); "no ceremony for small fixes" vs "including small ones"; the override's
  "no mid-task check-ins" vs Jev's "ask the operator".
- **Confidence:** high. **Rulebook-attributable:** yes.

### F-024 — Before vs after v7.4: same tokens per edit, 38 % more model calls per edit, leaner main context

- **Evidence:** 53 v7.0–7.3 sessions (891 prompts) vs 30 v7.4 sessions (835 prompts), classified by the
  CLAUDE.md text recorded in each session.
- **Numbers:**

  | Metric | v7.0–7.3 | v7.4 |
  |---|---:|---:|
  | Prompts with ≥ 1 spawn | 6.7 % | 38 % |
  | Main session's share of edits | 81.6 % | 5.7 % |
  | Subagent share of tokens | 15 % | 86 % |
  | Model calls per edit | 6.3 | 8.7 (+38 %) |
  | Input-equivalent tokens per edit | 289 k | 287 k |
  | Main max context p50 / p90 | 654 k / 963 k | 227 k / 609 k |
  | Compactions per 100 prompts | 1.8 | 0.1 |

- **Impact:** the mandate is roughly token-neutral and keeps long sessions lean, which is a real benefit.
  The cost is latency: more calls per unit of work, concentrated in small work (F-022).
- **Confidence:** medium (task mix differs between periods). **Rulebook-attributable:** yes.

### F-025 — Subagents start cold and re-read what siblings already read

- **Evidence:** 775 subagent transcripts (`summarize-agents.cjs`) and a Read-overlap script over all records.
- **Numbers:** first-call context p50 37.4 k (general-purpose 38.2 k, rulebook custom agents with a
  tool whitelist 15–24 k, e.g. implementer 19.5 k). v7.4 subagent p50: 63 model calls, 20.9 min,
  8.0 M processed tokens (v7.0–7.3: 38 calls, 7.8 min). 24.3 % of subagent file reads repeat a file a
  sibling subagent already read (v7.0–7.3: 10.4 %). 323 of 432 v7.4 spawns used general-purpose.
- **Impact:** "one subagent per task" maximizes cold starts; general-purpose doubles the fixed context
  of a whitelisted rulebook agent.
- **Confidence:** high. **Rulebook-attributable:** partly.

### F-026 — Orchestrator contexts still reach 0.5–0.9 M tokens, and latency grows with them

- **Numbers:** main context p50/max: Synap 790 k/963 k, UzPainter 483 k/966 k, ar-v3-dashboard
  354–364 k / 557–609 k, Rulebook 129 k/186 k. Request latency p50 rises ~1–1.5 s from the
  100–300 k bin to 700 k+. Rulebook's static text is ~1.7–5.7 k of that, so it is not the driver.
- **Confidence:** medium. **Rulebook-attributable:** partly (hand-back reports pile up in the main context).

### F-027 — Operator idle time and permission prompts dominate wall time and are not rulebook's

- **Numbers:** operator idle / wall: Synap 18.7 / 24.2 h, UzPainter 17.5 / 67.5 h, ar-v3-dashboard
  148.7 / 156.2 h. Vectorizer lost 109.7 h in 10 permission prompts. Prompt → first response is not
  slower under v7.4 (p50 5.3 s vs 9.3 s in controls; confounded by Opus 5 vs 5.5).
- **Confidence:** high. **Rulebook-attributable:** no.

### F-028 — Background orchestration is invisible, and that drives operator interventions

- **Evidence:** Synap transcript 2026-10-14 03:36–04:19Z: a background workflow launched at 03:38:55Z,
  then 1,350 s of silence before the first operator complaint and 914 s before the second
  ("nothing is running"); four agents were in fact running. This session showed the same pattern.
- **Confidence:** low (qualitative). **Rulebook-attributable:** partly (the spec says nothing about progress lines).

## B. Hooks seen from inside the transcripts

Moved: per-tool-call guard and cortex costs are in [01](01-measured-overhead.md) (F-001, F-005, F-006); the prompt gate (broken outside the rulebook repo, fires on machine inputs, "ask the operator" noise) is in [02](02-jev-gate.md) (F-007, F-010, F-011).

## C. Tokens

### F-029 — Always-on rulebook context is ~1.9 k tokens in a clean project, but its own budget test guards the wrong files

- **Evidence:** tiktoken cl100k over files and over what transcripts show was injected; replica of
  `tests/context-budget.test.ts`.
- **Numbers:** this repo: CLAUDE.md block 764, always-on rules 194, rulebook skill-listing lines 435,
  agent-listing lines 462, deferred MCP names 59 → 1,914 per session start. MCP schema on first use
  1,131 tokens (5,109 B). The test counts CLAUDE.md + AGENTS.md + override = 1,600 of 1,600, but
  AGENTS.md (796) is never loaded by Claude Code, and the test misses `typesafe.md`,
  `mcp-tool-reference.md`, listing lines and the per-prompt Jev context. The project's own benchmark now
  fails 4 budgets (MCP schema bytes 5,109 > 3,600, MCP init 267 > 250 ms, hot-path hooks 3 > 1,
  installed files 22 > 20). The budget ledger has no rows after v7.0.2.
- **Impact:** small in tokens (< 1 % of processed tokens), but the guard no longer measures reality, and
  the P0 test now *requires* the delegation mandate instead of forbidding process mandates.
- **Confidence:** high. **Rulebook-attributable:** yes.

### F-030 — `rulebook update` leaves v5/v6 rules, agents and skills behind: 4.5–5.7 k tokens per session and per spawn, contradicting v7.4

- **Evidence:** `src/core/migration/v6-cleanup.ts` deletes a retired rule only when it contains
  "Generated by @hivehub/rulebook"; v6 projections carry no such marker, so they survive as "user-authored".
- **Numbers:** Synap keeps 11 legacy v6 rules (2,781 tokens: incremental-implementation,
  sequential-editing "NEVER batch-read", no-shortcuts "Response time is IRRELEVANT", …) and 20 v5 agents
  → 5,676 rulebook tokens per session vs 1,914 in a clean project. ar-v3-dashboard ≈ 4,525; UzEngine
  9 legacy rules + 19 agents and still runs retired v6 hook scripts (269 non-blocking errors each).
- **Impact:** paid by every session and every spawn, and the leftovers fight the current rules.
- **Confidence:** high. **Rulebook-attributable:** yes.

### F-031 — Users are already overriding the delegation mandate, and `update` would undo their choice

- **Evidence:** Assets3D `CLAUDE.md` line 60 rewritten to "The main session does the work itself (user
  decision 2026-10-08)" and its override says not to run `rulebook update`; UzEngine override
  "Agents opt-in — implement directly"; Synap user section "Single-file edits … Delegating those just
  dilutes context and adds round-trip latency."
- **Numbers:** 3 of 7 v7.4 projects carry text that counters the mandate. Every session in them loads two
  opposing orchestration instructions.
- **Confidence:** high. **Rulebook-attributable:** yes.

### F-043 — Every shipped agent caps itself at 15–30 turns, below what a typical subagent needs

- **Evidence:** `templates/agents/*.md` frontmatter: implementer, tester, architect, quality-gatekeeper
  `maxTurns: 25`; researcher, code-reviewer, build-engineer, security-reviewer, performance-engineer 20;
  docs-writer 15; team-lead 30. A v7.4 subagent makes p50 63 model calls (F-025).
- **Observed 2026-10-14:** the `implementer` agent given task `phase1_task-create-with-content` used all
  25 turns reading the code (29 tool calls) and stopped with no edit and no report; the work had to be
  re-dispatched to a general-purpose agent, losing ~3 min and ~95 k tokens.
- **Impact:** the whitelisted rulebook agents are the cheap choice (19.5 k vs 38.2 k first call, F-025), but
  on medium tasks they stop mid-work, which pushes the model toward general-purpose and costs a re-dispatch.
- **Confidence:** high (config + one observed failure). **Rulebook-attributable:** yes.

## Recommendations from these two investigations

These feed `07-recommendations.md`; the panel reviews them before anything is decided.

1. **Replace the absolute delegation mandate with thresholds.** Do it directly at ≤ 3–5 edits in files
   already in context (≈ 15 tool calls). Delegate for ≥ 2 independent parts with disjoint files, broad
   exploration, long work (≈ 10+ edits / 50+ calls) or a main context past ~150–200 k. Add a config
   switch `orchestration: "judgment" | "orchestrator"`, default judgment. Expected: small requests back
   to ~11–16 calls and 4–7 min p50 instead of 56–65 calls and 13 min.
2. **Make the ceremony conditional:** CHANGELOG per release or PR, review = report + `git diff --stat`,
   full quality gate once at push, task archive only for tracked multi-session tasks.
3. **Prompt gate:** skip machine-generated inputs, strip IDE blocks before classifying, never emit "ask
   the operator" for an undecided kind, drop "Gate first" from always-on text, make the hook opt-in, and
   fail loudly (one visible line) when the CLI is missing instead of silent and slow. Lower the timeout
   from 8 s to ~2–3 s.
4. **Guards:** turn the OS-scheduling guard into `permissions.deny` rules evaluated in-process; keep one
   merged script for Edit|Write. Expected ~70–90 ms per Bash call and ~2,250 s per heavy session.
5. **Update must really clean up:** recognize unmarked v5/v6 rules by content hash, prune shipped agents
   and skills, strip retired hook entries. Expected −1.8 k to −2.8 k tokens per session and per spawn.
6. **Delegation hygiene:** prefer whitelisted rulebook agents over general-purpose (19.5 k vs 38.2 k first
   call), reuse warm agents via SendMessage for related tasks, terse hand-backs (status line + path), and
   a progress line after each dispatch and hand-back.
7. **Budget guard:** rewrite `context-budget.test.ts` to count what Claude Code actually injects, give
   AGENTS.md its own Codex budget, restore P0 as "no generated text mandates or forbids delegation",
   resume the ledger at v7.4.
