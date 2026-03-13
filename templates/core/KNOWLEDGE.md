# Project Knowledge Base

This project maintains an explicit knowledge base of patterns and anti-patterns.

## Structure

```
.rulebook/knowledge/
├── patterns/           # Approved patterns to follow
│   ├── <slug>.md
│   └── <slug>.metadata.json
└── anti-patterns/      # Known anti-patterns to avoid
    ├── <slug>.md
    └── <slug>.metadata.json
```

## Entry Format

Each knowledge entry includes:
- **Description**: What the pattern/anti-pattern is
- **Example**: Code showing correct (or incorrect) usage
- **When to Use**: Situations where this pattern applies
- **When NOT to Use**: Exceptions and edge cases

## Categories

- `architecture` — System-level design patterns
- `code` — Code-level patterns and idioms
- `testing` — Testing strategies and patterns
- `security` — Security patterns and practices
- `performance` — Performance optimization patterns
- `devops` — Infrastructure and deployment patterns

## Commands

```bash
rulebook knowledge add pattern "Repository Pattern" --category architecture
rulebook knowledge add anti-pattern "God Object" --category code
rulebook knowledge list --type pattern
rulebook knowledge show repository-pattern
rulebook knowledge remove god-object
```

## Rules

1. Patterns added here are auto-injected into AGENTS.md on `rulebook update`
2. AI assistants should follow patterns and avoid anti-patterns
3. Include concrete examples — abstract descriptions are less useful
4. Tag entries for searchability
