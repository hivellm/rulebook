# Proposal: phase3_jev-project-scope

## Why
The entry gate routes every prompt but never asks whether the prompt belongs
to this project at all. An unrelated request ("write my cover letter", work
meant for another repository) still gets a task, a subagent and a model. Jev
can answer "is this about this project?" as one more yes/no in the same call,
given a short project description, and the prompt hook
(`phase2_jev-prompt-gate-hook`) can then ask the operator to confirm — or, if
the project chooses, stop the prompt — before any work starts.

## What Changes
- Project description source, first hit wins: `gate.scope.description` in
  `rulebook.json`, then `package.json` `description`, then the first prose
  paragraph of `README.md`; clipped to 400 chars. None found → the scope
  question is not asked.
- `GateState.project.description` (`src/core/typesafe/gate.ts`), loaded in
  `loadGateSources()`, counted in `stateBytes` and trimmed to 200 chars before
  the prompt is trimmed.
- New noul `in_project_scope` in `buildGateQuestions()` (only when a
  description exists); `GateRouting.inProjectScope` (true ≥ 0.7, false ≤ 0.3,
  null in between or when not asked); `renderInstruction()` mentions an
  off-topic result.
- Prompt hook: `in_project_scope` ≤ `gate.scope.offTopicBelow` (default 0.15)
  → `gate.scope.onOffTopic`: `ask` (default — context tells the model to
  confirm with the operator before acting) or `block` (the prompt is stopped
  with a reason). Between 0.15 and 0.3 → a warning line only.
- Config `gate.scope` (`enabled` default true, `description`,
  `offTopicBelow`, `onOffTopic`).

## Impact
- Affected specs: gate-hooks (project scope), gate (question set)
- Affected code: src/core/typesafe/gate.ts, src/core/typesafe/prompt-hook.ts, src/types.ts, src/cli/commands/gate.ts (render row), templates/core/orchestration.md
- Breaking change: NO (no description → unchanged behaviour; default action is `ask`, not `block`)
- User benefit: off-topic prompts are caught before a task or subagent is spent on them
- Depends on: phase2_jev-prompt-gate-hook (prompt hook, `gate` config section)
