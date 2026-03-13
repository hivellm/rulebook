# Decision Records

This project uses Architecture Decision Records (ADRs) to track important technical decisions.

## Format

Decisions are stored in `.rulebook/decisions/` as numbered Markdown files:

```
.rulebook/decisions/
├── 001-use-postgres.md
├── 001-use-postgres.metadata.json
├── 002-api-rest-over-graphql.md
└── 002-api-rest-over-graphql.metadata.json
```

## Status Lifecycle

- **proposed** → Initial state when a decision is recorded
- **accepted** → Team has agreed on this decision
- **superseded** → Replaced by a newer decision (links to replacement)
- **deprecated** → No longer applicable

## Commands

```bash
rulebook decision create "Use PostgreSQL"   # Create a new ADR
rulebook decision list                      # List all decisions
rulebook decision show 1                    # Show full decision details
rulebook decision supersede 1 5             # Mark decision 1 as superseded by 5
```

## Rules

1. Every significant architectural choice SHOULD have a decision record
2. Decisions MUST include context, the decision itself, alternatives considered, and consequences
3. Never delete a decision — supersede or deprecate it instead
4. Reference related tasks when applicable
