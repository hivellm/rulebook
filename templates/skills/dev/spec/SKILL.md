---
name: spec
description: Author a rulebook task spec interactively — research, draft, ask the user clarifying questions, confirm, then create the tasks in rulebook ready for /rulebook-driver. Use when the user wants to plan/spec a feature before implementing.
model: opus
context: main
---
Author a rulebook task spec for: $ARGUMENTS

This skill runs in the MAIN conversation (not a forked subagent) so it CAN ask
the user questions with the AskUserQuestion tool. It drives the `spec-author`
workflow as its drafting/critique engine, loops with the user until the spec is
solid, confirms, then creates the rulebook tasks and hands off to
`/rulebook-driver`.

## Steps

1. **Pre-flight.** If `$ARGUMENTS` is empty, ask the user what they want to spec.
   Read `.rulebook/specs/RULEBOOK.md` for the required spec format
   (## ADDED/MODIFIED, "### Requirement: <name>" with SHALL/MUST, "#### Scenario:"
   with Given/When/Then).

2. **Draft + critique loop.** Run the `spec-author` workflow with the topic:
   `Workflow({ name: "spec-author", args: { topic: "<topic>" } })`.
   It returns `{ draft, ready, questions[], gaps[], missingScenarios[] }`.

3. **Ask the user.** If `ready` is false, take the returned `questions` (each has
   `question`, `why`, `options`) and present them with the **AskUserQuestion**
   tool — one question per item, using the provided `options` as choices (the
   user can always answer free-form). Also surface `gaps` and `missingScenarios`
   so the user can react to them.

4. **Iterate.** Re-run the workflow feeding the answers back:
   `Workflow({ name: "spec-author", args: { topic: "<topic>", answers: [{ question, answer }, ...] } })`.
   Accumulate ALL answers across rounds (don't drop earlier ones). Repeat steps
   3–4 until the workflow returns `ready: true` (no open questions).

5. **Confirm with the user.** Show the final proposal + spec (the workflow's
   `draft`). Ask the user to confirm with AskUserQuestion: **"Create these
   rulebook tasks?"** options: Create / Revise (more questions) / Cancel.
   - Revise → go back to step 3.
   - Cancel → stop, leave nothing created.
   - Create → continue.

6. **Create the tasks.** ONLY after explicit confirmation, create the task(s) in
   rulebook using the MCP tools — never `mkdir`/`Write` by hand:
   - `rulebook_task_create` for each task (phase-prefixed id, e.g.
     `phase1_<slug>`), writing the confirmed proposal.md, tasks.md checklist,
     and specs/<module>/spec.md from the draft.
   - `rulebook_task_validate` each created task; fix format issues and re-validate
     until clean.

7. **Hand off to the driver.** Report the created task ids and tell the user the
   spec is ready. Offer to start implementation now by running the
   `rulebook-driver` workflow: `/rulebook-driver` (drains the whole backlog) or
   `/rulebook-driver { "once": true }` for one item. Do NOT auto-start it without
   the user's go-ahead.

## Rules

- The user MUST confirm (step 5) before any task is created. No silent creation.
- Workflow subagents can't prompt the user — that's why the asking happens here
  in the main loop. Always relay the workflow's questions verbatim where useful.
- Keep accumulating answers across iterations; the workflow folds them into the
  draft as settled decisions.
- Specs and tasks are created via `rulebook_*` MCP tools only.
