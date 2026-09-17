## 1. Core model
- [x] 1.1 Add TaskQuestion type + pure helpers (id allocation, operator prompt rendering) in src/core/tasks/task-questions.ts
- [x] 1.2 File backend: questions persisted in .metadata.json; ask/answer/listQuestions; blocked guard; archive guard; metadata-preserving status updates
- [x] 1.3 GitHub backend: questions as a body section; same ask/answer/listQuestions semantics

## 2. Surfaces
- [x] 2.1 MCP rulebook_task: actions ask|answer|questions; open questions in list/show; session start returns openQuestions
- [x] 2.2 STATE.md and tasks README index show awaiting-decision questions
- [x] 2.3 CLI: rulebook task ask / questions / answer (interactive form when no answer given)

## 3. Guidance
- [x] 3.1 Templates (rulebook.md, claude-md.md, agents-lean.md): decide-or-ask rule
- [x] 3.2 rulebook-driver workflow: halt with awaiting-decision, instruct dev agent to ask instead of guessing

## 4. Tail (docs + tests — check or waive with tailWaiver)
- [x] 4.1 Update or create documentation covering the implementation
- [x] 4.2 Write tests covering the new behavior
- [x] 4.3 Run tests and confirm they pass
