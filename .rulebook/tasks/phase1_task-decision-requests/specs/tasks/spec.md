## ADDED Requirements

### Requirement: Decision requests on tasks
The system SHALL let a task carry zero or more decision requests ("questions"), each with a one-line question, optional options, an optional recommended option, the checklist item it blocks, and an open/answered status.

#### Scenario: Ask a question
Given an active task
When `ask` is called with a question
Then the question is stored with a sequential id (`q1`, `q2`, ...) and status `open`, and the task status becomes `blocked`

#### Scenario: Answer a question
Given a task with an open question
When `answer` is called with the question id and an answer
Then the question status becomes `answered` with the answer recorded, and if no open questions remain the task status returns to `in-progress`

#### Scenario: Answer must be explicit
Given a task with an open question
When `answer` is called with an empty answer
Then the call is refused

### Requirement: Blocked needs a reason
The system MUST refuse `update status=blocked` on a task that has neither an open question nor a `blockedBy` dependency, and MUST point the caller to `ask`.

#### Scenario: Blocking without a question
Given a task with no open questions and no blockedBy
When status is updated to `blocked`
Then the update fails with a message naming the `ask` action

### Requirement: Archive refuses open questions
The system MUST refuse to archive a task that has an open question, even with a tail waiver.

#### Scenario: Archive with an open question
Given a task with an open question
When `archive` is called
Then the call fails and names the open question id

### Requirement: Operator prompt
The system SHALL return, with every `ask` result, a compact operator-facing prompt and an instruction to present it to the operator before continuing.

#### Scenario: Prompt content
Given `ask` is called with options and a recommendation
When the result is produced
Then it contains the question, each option, and the recommended option on separate lines

### Requirement: Open questions are surfaced
The system SHALL expose open questions in `rulebook_session start`, task `list`/`show`, `STATE.md`, the tasks README index, and the CLI.

#### Scenario: Session start
Given one task with an open question
When `rulebook_session start` runs
Then the result contains that question under `openQuestions` with its task id

### Requirement: Metadata is preserved
The system MUST preserve unrelated fields in `.metadata.json` (e.g. `blocks`, `blockedBy`, `questions`) when the status changes.

#### Scenario: Status update keeps questions
Given a task with one answered question
When the status is updated
Then the question is still present afterwards
