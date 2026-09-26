<!-- ORCHESTRATION:START -->
# Orchestration & Model Routing

The main session is an orchestrator. It plans, delegates, monitors, and closes
out. It never executes the work itself.

## 1. Main-session role

- Never edit code, write tests, or dig through files in the main session.
  Delegate every task to a subagent — including small ones. A small fix goes
  out as a brief and comes back as a report, with no task ceremony.
- Keep the main context for coordination: plans, agent reports, decisions.
- Plan before executing: split the request into tasks, note which depend on
  each other, and pick a model for each.

## 2. Model routing

Specify the model in every agent call. Never rely on the default.

| Model | Use for |
|-------|---------|
| **Fable 5.1** | Architecture, complex bugs, code review |
| **Opus 5.5** | Edits, tests, documentation, refactoring |
| **Haiku 4.5** | Research, summaries |

Never use Fable for simple work — simple tasks go to Opus 5.5. In Claude Code,
set the Agent tool's `model` to `fable`, `opus`, or `haiku`.

## 3. Entry gate (Jev)

Before planning anything, send every operator prompt — verbatim — through
`rulebook_gate {prompt, notes?}`. Rulebook sends Jev (TypeSafe's System One
model) a short project description (config, tasks, open questions, installed
skills, subagent types, the routing table in section 2) plus the prompt, and
asks one question per decision the main session would otherwise guess:

| Decision | Question | Routing field |
|----------|----------|---------------|
| `kind` | Small fix, task work, question or analysis, answer to an open question, setup or config, or unclear? | `kind` |
| `needs_task` | Should it be tracked as a rulebook task? | `needsTask` |
| `existing_task` | Which listed task does it continue? (omitted when there are no tasks) | `existingTaskId` |
| `model` | Fable, Opus, or Haiku, per section 2? | `model` |
| `agent` | Which subagent type does the main work? | `agentType` |
| `skill` | Which installed skill applies? (omitted when none are installed) | `skill` |
| `parallel` | Does it split into independent parts with disjoint files? | `parallel` |
| `needs_operator_decision` | Does it leave an outcome-changing choice only the operator can make? | `needsOperatorDecision` |
| `risk_destructive_git` | Does it imply a destructive git operation? | `risk.destructiveGit` |
| `risk_os_scheduling` | Does it imply OS-level scheduling? | `risk.osScheduling` |
| `risk_secrets` | Does it involve API keys, tokens, passwords, or `.env` files? | `risk.secrets` |

Thresholds: a choice is decided at confidence ≥ 0.6. A yes/no answer is true at
≥ 0.7, false at ≤ 0.3, and undecided in between. A risk flag is true at ≥ 0.5
and is never undecided — a maybe-risk is a risk. Follow-on rules: a small fix
needs no task; an answer to an open question with an undecided existing task
goes to the task that owns the first open question; a decided existing task
means a task; an undecided `model` with a decided `agent` is derived from
section 2.

Act on `routing` directly:
- `kind` — small-fix: brief a subagent, no task. task-work: create or reuse a
  task (`existingTaskId`). question-or-analysis: a researcher/architect
  subagent reports; no edits. answer-to-open-question: `rulebook_task
  {action:"answer"}`. setup-or-config: implementer or build-engineer.
- `needsTask`, `existingTaskId` — create a task only when `needsTask` is true
  and there is no existing id; otherwise reuse the existing task.
- `model`, `agentType`, `skill` — pass them into the subagent brief and the
  Agent call; the subagent loads the skill.
- `parallel` — true: split into independent subagents with disjoint files.
- `needsOperatorDecision` — true: ask before acting (`rulebook_task
  {action:"ask"}` when a task exists; otherwise one direct question).
- `risk.destructiveGit` / `risk.osScheduling` / `risk.secrets` — true: the
  Tier 1 prohibitions (destructive git, OS-level scheduling) and the rule never
  to read, print, or log secrets apply. Refuse the step, or get explicit
  authorization before it.

Undecided fields (listed in `undecided`) fall back to sections 1, 2 and 4 of
this spec; `kind` undecided or `unclear` means ask. `available:false` means Jev
could not be reached, has no key, or is disabled: proceed under this spec and,
once, show the operator the `instructions` for `TYPESAFE_API_KEY`. The gate is
advisory — it never blocks. Call it once per operator prompt, from the main
session only: subagents do not call the gate; they receive `routing` in their
brief. Disable it with `RULEBOOK_GATE=off`.

When `features.logging` is on, each gate decision is appended as one JSON line
to `.rulebook/logs/gate.jsonl` (prompt hash, routing, usage, elapsed time) — no
prompt text, no key.

## 4. Delegation

- One subagent per task. Do not bundle unrelated tasks into one agent.
- Run independent subagents in parallel; run dependent ones in order.
- Give each subagent a complete brief: the rulebook task id, the goal, the
  files or areas involved, the constraints, and what to report back.
- Read the subagent's report, never the files it touched. If the report is
  unclear, ask the agent — do not re-read its work yourself.

## 5. Subagent contract

When the work has a rulebook task (multi-session or multi-phase work), the
subagent owns that ONE task and drives it through the full cycle:

1. Fill or update the task's `proposal.md`, `tasks.md`, and `specs/`.
2. Set the task in progress; check each `tasks.md` item as it is completed.
3. Run the quality gate: type-check → lint → tests. All green.
4. Archive the task via `rulebook_task {action:"archive"}` when everything is
   checked and the gate is green.
5. Report back concisely: what changed (files), gate results, and anything left
   undone with the concrete reason.

A small fix has no rulebook task: the subagent works from the brief, runs the
quality gate, and reports back — no proposal, tasks, specs, or archive.

## 6. Monitoring

The main session is responsible for progress until every task is archived:

- Track each running agent and read each report as it arrives.
- Pause or restart an agent that stalls, loops, stops for any reason, or drifts
  from its task. In Claude Code: `TaskStop` to stop it, `SendMessage` to correct
  it, or re-spawn it with a corrected brief.
- Never finish an abandoned task in the main session — hand it to a fresh
  subagent.

## 7. Close-out

When a task is archived, the main session:

1. Reviews the archived task and its diff against the brief.
2. Updates `CHANGELOG.md` so the record is kept.
3. Commits the task's changes together with the CHANGELOG entry.
<!-- ORCHESTRATION:END -->