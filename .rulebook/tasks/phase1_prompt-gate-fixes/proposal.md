# Proposal: phase1_prompt-gate-fixes

## Why
The Jev prompt gate runs on machine-generated inputs (75–94 % of its runs), sends IDE/system blocks to the classifier, renders "ask the operator" whenever kind is undecided or unclear (64 % of decisions; gate.ts:584), reads every active task's files on each prompt (1.65 MB at 90 tasks, 159–175 ms) and can run migrateArchive on a read path (docs/analysis/multi-session-performance/02-jev-gate.md F-009, F-010, F-011; 06 F-040).

## What Changes
- Return no answer (no Jev call) for inputs starting with `<task-notification>`, agent hand-backs, cross-session messages.
- Strip `<ide_opened_file>`, `<ide_selection>`, `<system-reminder>` blocks before classifying.
- renderInstruction: "ask the operator" only when `needsOperatorDecision === true`; inject nothing when ≥ 3 fields are undecided.
- Drop the skill/agent/model/parallel questions from the hook request.
- Gate task listing reads only `.metadata.json` and never runs migrateArchive.
- On a missing/broken CLI: one `systemMessage` per session (marker file), never per prompt.
- Deadline 1.5 s, settings timeout 3 s.

## Impact
- Affected specs: docs/analysis/multi-session-performance/08-execution-plan.md
- Affected code: src/cli/commands/hook.ts, src/core/typesafe/gate.ts, src/core/typesafe/prompt-hook.ts, src/core/tasks/task-manager.ts, templates/hooks/jev-gate.sh, tests/*gate*.test.ts
- Breaking change: NO
- User benefit: ~75–94 % of gate runs skipped; ask-rate on the 50 logged prompts ≤ 15 %; state build at 90 tasks ≤ 20 ms.
