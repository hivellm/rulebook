# Spec: skill-agent-library

## REMOVED Requirements

### Requirement: Unused skills and agent templates pruned
The shipped library MUST contain only the data-derived keep-list (skills enabled
across projects, present slash commands, delegation agents) plus the core
workflow skills. Skills and agent templates outside the keep-list MUST be
removed from `templates/`.

#### Scenario: Pruned skill is absent from the library
Given a skill that is not in the keep-list
When the template library is enumerated
Then that skill's `SKILL.md` is no longer present

#### Scenario: Skill manager has no dangling references
Given the library has been pruned
When `rulebook_skill_list` and `rulebook_skill_search` run
Then every returned entry resolves to an existing template
And no lookup targets a removed skill or agent

## ADDED Requirements

### Requirement: Core keep-list retained and installable
The core workflow skills and the delegation agents MUST remain installable.

#### Scenario: Default init provisions only the core
Given a fresh project
When `rulebook init` runs with defaults
Then only the core keep-list skills/agents are installed into `.claude/`

#### Scenario: A retained delegation agent resolves
Given the library has been pruned
When the `implementer` agent is requested
Then its template resolves and installs
