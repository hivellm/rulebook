## ADDED Requirements

### Requirement: Recurring learnings are counted, not duplicated
The system SHALL treat a captured learning whose slug matches an existing, unpromoted learning as a recurrence: it MUST increment `occurrences`, update `lastSeenAt`, keep the newest content, and MUST NOT create a second entry.

#### Scenario: Same title captured twice
Given a learning "Regenerate API client" already captured once
When it is captured again under the same title
Then one learning exists with occurrences 2 and the newest content

#### Scenario: Promoted learning is not merged into
Given a learning that was already promoted
When a learning with the same title is captured
Then a new learning is created with occurrences 1

### Requirement: Skill candidates
The system SHALL list unpromoted learnings with `occurrences` at or above a threshold (default 2) as skill candidates, most recurrent first.

#### Scenario: Candidate threshold
Given learnings seen 1, 2 and 3 times
When skill candidates are requested with the default threshold
Then the ones seen 2 and 3 times are returned, the 3-times one first

### Requirement: Promote to skill
The system SHALL promote a learning to a project skill by writing `.claude/skills/<slug>/SKILL.md` with frontmatter (name, description) and a procedure body (when to use, steps, verify), and MUST mark the learning as promoted to that skill.

#### Scenario: Skill file written
Given a learning with content
When it is promoted with target "skill"
Then `.claude/skills/<slug>/SKILL.md` exists, its frontmatter name is the slug, and the learning's promotedTo is {type:"skill", id:<slug>}

#### Scenario: Existing skill is not overwritten
Given `.claude/skills/<slug>/SKILL.md` already exists
When a learning with that slug is promoted to skill
Then the promotion fails and the file is unchanged

### Requirement: Project skills are discoverable
The system SHALL include skills found under the project's `.claude/skills/` in the skills index under category `project`, disabled unless listed in the project config.

#### Scenario: Project skill listed
Given `.claude/skills/deploy-docs/SKILL.md` exists in the project
When skills are discovered
Then a skill with id `project/deploy-docs` and category `project` is present

### Requirement: Candidates are surfaced
The system SHALL return skill candidates from `rulebook_session start` and from the learning list, with a hint to promote them.

#### Scenario: Session start
Given a learning seen twice
When `rulebook_session start` runs
Then the result contains that learning under `skillCandidates`
