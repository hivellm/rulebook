# CLI Specification

## ADDED Requirements

### Requirement: Library Selection With Confirm And Override
The system SHALL, in interactive `init`, present detected libraries as a pre-checked list
that the user can confirm or edit before generation.

#### Scenario: Confirm detected libraries
Given init detects React and Prisma
When the user is prompted and accepts the detected libraries
Then the generated config includes react and prisma

#### Scenario: Edit detected libraries
Given init detects React and Prisma
When the user unchecks Prisma and adds Tailwind in the prompt
Then the generated config includes react and tailwind and excludes prisma

### Requirement: Manual Library Selection For Empty Projects
The system SHALL offer a full library checklist grouped by language when no libraries are
detected, so the user can select libraries manually.

#### Scenario: Empty folder offers manual library selection
Given an empty project directory in interactive mode
When init runs
Then the user is offered a library checklist grouped by language and the selection is written to the config

## MODIFIED Requirements

### Requirement: Interactive Init Language Selection
The system SHALL prompt the user to select languages during interactive `init` when
language detection returns no results, instead of producing an empty configuration.

#### Scenario: Empty detection prompts for languages
Given a project where no languages are detected and init runs without --yes
When init reaches configuration
Then the user is shown the language checklist and must select at least one language

#### Scenario: Non-interactive init keeps auto-detection
Given init runs with the --yes flag
When configuration is built
Then it is populated from detection results without prompting
