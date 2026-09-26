# Gate Hooks Specification

## ADDED Requirements

### Requirement: Project description source
The gate SHALL describe the project to Jev with one short description taken
from the first available source: `gate.scope.description` in `rulebook.json`,
then the `description` field of `package.json`, then the first prose paragraph
of `README.md`. The description MUST be at most 400 characters, and a read
error or missing source MUST yield no description rather than an error.

#### Scenario: Config wins
Given `gate.scope.description` is "CLI that standardises AI agent rules" and `package.json` has a different description
When the gate state is built
Then `project.description` MUST be "CLI that standardises AI agent rules"

#### Scenario: README fallback
Given no configured description, no `package.json`, and a README that starts with a heading, a badge line, and then a prose paragraph
When the gate state is built
Then `project.description` MUST be that prose paragraph, clipped to 400 characters

#### Scenario: Nothing found
Given no configured description, no `package.json` description, and no README
When the gate runs
Then the `in_project_scope` question MUST NOT be sent and `routing.inProjectScope` MUST be null

### Requirement: Project-scope question
When a description exists and `gate.scope.enabled` is not false, the gate
SHALL add the noul `in_project_scope` to the same single Jev request and MUST
expose `routing.inProjectScope` as true at ≥ 0.7, false at ≤ 0.3, and null in
between. The state MUST stay at or under 8192 bytes, with the description
trimmed to 200 characters before the prompt is trimmed.

#### Scenario: On-topic prompt
Given a description and Jev returns `in_project_scope` = 0.92
When `rulebook_gate {prompt}` is called
Then `routing.inProjectScope` MUST be true and the request count MUST still be one

#### Scenario: Undecided scope
Given Jev returns `in_project_scope` = 0.5
When the answers are interpreted
Then `routing.inProjectScope` MUST be null and `in_project_scope` MUST be listed in `undecided`

### Requirement: Off-topic handling in the prompt hook
When `in_project_scope` is at or below `gate.scope.offTopicBelow` (default
0.15), the prompt hook SHALL apply `gate.scope.onOffTopic`: `ask` (default)
MUST put an instruction to confirm with the operator before acting at the top
of `additionalContext`; `block` MUST return `decision: "block"` with a reason
that names the project and the config key. A probability above
`offTopicBelow` and at or below 0.3 SHALL only add a warning line. Without a
description the hook MUST NOT block or ask on scope.

#### Scenario: Off-topic, ask mode
Given `onOffTopic` is `ask` and Jev returns `in_project_scope` = 0.05
When the operator submits "write me a cover letter for a marketing job"
Then the hook MUST NOT block and `additionalContext` MUST begin with the confirm-with-the-operator instruction

#### Scenario: Off-topic, block mode
Given `onOffTopic` is `block` and Jev returns `in_project_scope` = 0.05
When the operator submits an unrelated prompt
Then the hook MUST print `decision: "block"` with a reason naming `gate.scope.onOffTopic`

#### Scenario: Borderline
Given Jev returns `in_project_scope` = 0.25
When the hook answers
Then it MUST NOT block or ask, and the context MUST contain an off-topic warning line

#### Scenario: Jev unavailable
Given no TypeSafe key is configured
When an unrelated prompt is submitted
Then the hook MUST exit 0 with no output, as for any fail-open case
