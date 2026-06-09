# Generators Specification

## ADDED Requirements

### Requirement: Lean Library Rule Generation
The system SHALL generate a rule specification for a library only when that library is
detected or selected, so generated guidance contains only what the project uses.

#### Scenario: Detected library produces a focused spec
Given a project where React, Tailwind, and Prisma are detected
When generation runs
Then `.rulebook/specs/REACT.md`, `.rulebook/specs/TAILWIND.md`, and `.rulebook/specs/PRISMA.md` are written and referenced in AGENTS.md

#### Scenario: Undetected libraries produce nothing
Given a project that does not use Drizzle
When generation runs
Then no Drizzle spec is generated and AGENTS.md contains no Drizzle reference

### Requirement: Path-Scoped Library Rules
The system SHALL emit a path-scoped `.claude/rules/<lib>.md` for any detected library that
declares rule globs in its registry entry.

#### Scenario: Tailwind emits a path-scoped rule
Given Tailwind is detected and its registry entry declares rule globs
When generation runs
Then a `.claude/rules/tailwind.md` file is written with those globs in its frontmatter

#### Scenario: Library without globs emits no path-scoped rule
Given a detected library whose registry entry declares no rule globs
When generation runs
Then no `.claude/rules` file is created for that library
