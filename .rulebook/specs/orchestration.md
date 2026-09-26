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

## 3. Delegation

- One subagent per task. Do not bundle unrelated tasks into one agent.
- Run independent subagents in parallel; run dependent ones in order.
- Give each subagent a complete brief: the rulebook task id, the goal, the
  files or areas involved, the constraints, and what to report back.
- Read the subagent's report, never the files it touched. If the report is
  unclear, ask the agent — do not re-read its work yourself.

## 4. Subagent contract

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

## 5. Monitoring

The main session is responsible for progress until every task is archived:

- Track each running agent and read each report as it arrives.
- Pause or restart an agent that stalls, loops, stops for any reason, or drifts
  from its task. In Claude Code: `TaskStop` to stop it, `SendMessage` to correct
  it, or re-spawn it with a corrected brief.
- Never finish an abandoned task in the main session — hand it to a fresh
  subagent.

## 6. Close-out

When a task is archived, the main session:

1. Reviews the archived task and its diff against the brief.
2. Updates `CHANGELOG.md` so the record is kept.
3. Commits the task's changes together with the CHANGELOG entry.
<!-- ORCHESTRATION:END -->