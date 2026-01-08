---
name: rulebook-skill
description: Manage Rulebook skills - list, add, remove, show, and search
---

Manage Rulebook skills for the current project.

## Commands

```bash
# List all available skills
rulebook skill list

# List enabled skills only
rulebook skill list --enabled

# Add a skill
rulebook skill add <skill-id>

# Remove a skill
rulebook skill remove <skill-id>

# Show skill details
rulebook skill show <skill-id>

# Search for skills
rulebook skill search <query>
```

## Skill Categories

- `languages/` - Language-specific rules (typescript, python, rust, etc.)
- `frameworks/` - Framework rules (nestjs, react, django, etc.)
- `modules/` - MCP module integration (supabase, playwright, etc.)
- `services/` - Database and service rules (postgresql, redis, etc.)
- `core/` - Core Rulebook standards

## Examples

```bash
rulebook skill add languages/typescript
rulebook skill add frameworks/nestjs
rulebook skill search "database"
rulebook skill show languages/rust
```
