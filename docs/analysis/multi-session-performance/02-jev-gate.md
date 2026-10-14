# 02 — The Jev prompt gate

The v7.4 `UserPromptSubmit` hook runs `.claude/hooks/jev-gate.sh prompt` → `rulebook hook prompt-gate`
→ one TypeSafe "Jev" classification request, and injects the routing as `additionalContext`.
Measured 2026-10-14 with the hook harness (`work/hookperf/decompose.mjs`, `slim.mjs`, `count.mjs`),
the gate logs (`.rulebook/logs/gate.jsonl`) and the transcripts.

## F-007 — The gate does not work in any project except the rulebook repo, and fails silently

- **Evidence:** `jev-gate.sh:37-46` looks for the project's `node_modules/.bin/rulebook` (absent in
  every project), then the repo's own `dist/` (only inside `@hivehub/rulebook`), then `rulebook` on PATH.
  On this machine that PATH entry, `%APPDATA%/npm/node_modules/@hivehub/rulebook`, is a junction to
  `F:\Node\hivellm\rulebook`, which has no `dist/` ("Cannot find module"). The wrapper drops stderr and
  exits 0. In Codex the wrapper has no `CLAUDE_PROJECT_DIR` (the string is absent from `codex.exe`), so it
  can only reach the same broken global CLI.
- **Numbers:** since 09-26, "Jev routing" reached the model only in the rulebook repo (29 times). Zero
  injections in UzPainter, Synap, UzEngine, ar-v3-dashboard and ar-v3-normalization. Each silent run
  costs 468–488 ms. 51 prompts were cancelled by Claude Code's 8 s timeout (Assets3D 37 of 37 prompts on
  10-08, UzPainter 5, ar-v3-dashboard 2), 8.0–16.0 s each, 491 s in total. Where no routing arrived, main
  sessions called `rulebook_gate` by hand 12 times (+2 turns each, one ToolSearch).
- **Impact:** every prompt in six v7.4 projects pays ~0.5 s for nothing and occasionally 8–16 s.
- **Confidence:** high (root cause of the >8 s cancellations not determined; that day was heavily loaded).
  **Rulebook-attributable:** yes (silent failure and fragile CLI resolution are rulebook's; the broken
  junction is local machine state).

## F-008 — Where it works, the gate costs ~0.93 s per prompt; two thirds of that is avoidable plumbing

- **Numbers (rulebook repo, median of 3):**

  | Stage | Cost |
  |---|---:|
  | Shell layer: outer bash + inner bash + `$(cat)` + `grep` | ≈ 175 ms |
  | Node start | 78–91 ms |
  | Module loading, full CLI (`dist/index.js` imports every command: 43 dist + 36 package modules) | 118–140 ms |
  | Module loading, slim entry (7 dist + glob) | 24–32 ms |
  | Building the request state, rulebook repo (1 task) | 5.3 ms |
  | same, 90 active tasks (UzPainter shape) | 159–175 ms (1,249 ms cold cache, UzEngine) |
  | New TLS connection per hook process | 48–66 ms |
  | Jev request itself | 286–359 ms (gate log p50 402 / p90 471 / max 596 ms, n=41) |
  | **End-to-end, current wrapper** | **929 ms** (877–946) |
  | End-to-end, exec form + slim entry (prototype) | 622 ms (613–649) |
  | Startup only with `RULEBOOK_GATE=off`: current / slim in wrapper / slim exec form | 401 / 307 / 119 ms |

- **Confidence:** high. **Rulebook-attributable:** yes.

## F-009 — Every prompt reads every active task's files, though the gate uses only id and status

- **Evidence:** `gate.ts:721` → task backend `listTasks`: per active task `.metadata.json` (twice),
  `proposal.md`, `tasks.md`, `design.md`, every `specs/*/spec.md` (`task-manager.ts:518-589`);
  `migrateArchive` runs on this read path (`task-manager.ts:434-460`) and can create folders and move files
  when a legacy `tasks/archive` exists; learnings metadata (`learn-manager.ts:135-140`); `.claude/skills`;
  `package.json`/`README.md`; the whole `gate.jsonl` is re-read before each append (`gate.ts:803-812`).
- **Numbers:** rulebook-shaped project: 32 readFile, 11 existsSync, 6 readdirSync, 10 access per prompt.
  At 90 tasks: 1.65 MB read per prompt, 159–175 ms. Request body 4.9 KB (1 task) to 7.2 KB (90 tasks);
  ~1.7–2.2 k Jev input tokens per call.
- **Confidence:** high. **Rulebook-attributable:** yes.

## F-010 — The gate also runs on machine-generated inputs: 75–94 % of its runs

- **Evidence:** a "Jev routing" record lands 0.70–0.82 s after `<task-notification>` lines exactly as
  after operator prompts. The hook cannot tell them apart today.
- **Numbers:** rulebook repo: 21 of 28 injections followed notifications or mid-turn deliveries.
  Conversation inputs vs operator prompts: UzPainter 584 vs 38 (94 % machine-generated), Synap 93 vs 6,
  ar-v3-dashboard 66 vs 33.
- **Impact:** delegation multiplies gate runs; each hand-back pays ~0.5–0.9 s and a Jev call, and gets
  routing advice for a message no human wrote.
- **Confidence:** high. **Rulebook-attributable:** yes.

## F-011 — "Ask the operator" on 64–93 % of decisions; the model almost never asks

- **Numbers:** all gate logs (rulebook 41 + UzPainter 9 = 50 decisions): kind undecided 22, unclear 8,
  small-fix 7, question 8, task-work 4, setup 1; 32 of 50 (64 %) routed to "ask the operator before
  acting". In injected context: 27 of 29 (93 %), including for "git status e comite". Follow-ups:
  0 AskUserQuestion, 0 `rulebook_task ask`, 1 turn ending in a question; the model proceeded with tools on
  11 of 18 ask-routed prompts. IDE blocks (`<ide_opened_file>…`) are sent to the classifier and push it
  to unclear/undecided.
- **Impact:** ~103 tokens and ~0.9 s per prompt of advice that contradicts the operator's own override
  ("no mid-task check-ins"); the model learns to ignore the gate.
- **Confidence:** medium. **Rulebook-attributable:** yes.

## F-012 — Cheaper ways to run the gate, and their limits

- **`async: true`:** useless here; the context would arrive on the *next* turn and the hook could no
  longer block a scheduling request.
- **Exec form + slim entry:** measured 929 → 622 ms (F-008).
- **`type: "mcp_tool"` hook** calling `rulebook_gate` on the already-running MCP server: drops bash, node
  start and CLI resolution and reuses a warm connection; estimated 300–400 ms; also fixes F-007.
  Not prototyped; whether `${prompt}` substitution works is unverified; Codex support unknown.
- **Deadline:** rulebook's internal deadline is 5 s (`prompt-hook.ts:42`), Claude Code's timeout 8 s;
  a working run takes 0.6–0.9 s.
- **Off entirely:** v7.0 removed the per-prompt hook on purpose (`docs/analysis/v7-performance` F-002);
  the on-demand `rulebook_gate` tool remains.
- **Rulebook-attributable:** yes (design choice).
