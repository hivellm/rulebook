---
name: rulebook-task-management
description: "Creates spec-driven task directories, writes proposals with requirements, generates implementation checklists, and validates task structure using OpenSpec format. Use when starting a new feature, planning a breaking change, writing a task proposal or spec file, validating task structure before implementation, or archiving completed work."
version: "1.0.0"
category: core
author: "HiveLLM"
tags: ["task-management", "openspec", "spec-driven", "workflow"]
dependencies: []
conflicts: []
---

# Rulebook Task Management

## When to Create Tasks

**Create tasks for:**
- New features/capabilities
- Breaking changes
- Architecture changes
- Performance/security work

**Skip for:**
- Bug fixes, typos, formatting, comments
- Dependency updates (non-breaking)

## Task Commands

```bash
rulebook task create <task-id>    # Create task directory + templates
rulebook task list                # List all tasks with status
rulebook task show <task-id>      # Show task details
rulebook task validate <task-id>  # Validate structure + completeness
rulebook task archive <task-id>   # Archive (requires docs + tests passing)
```

## Mandatory Workflow

**NEVER start implementation without creating a task first:**

1. **STOP** — Do not start coding
2. **Create task** — `rulebook task create <task-id>`
3. **Write proposal.md** — Document why and what changes (see example below)
4. **Write tasks.md** — Create implementation checklist
5. **Write spec deltas** — Define requirements with SHALL/MUST keywords
6. **Validate** — `rulebook task validate <task-id>`
7. **THEN** — Start implementation

## Task Directory Structure

```
.rulebook/tasks/<task-id>/
├── proposal.md         # Why and what changes
├── tasks.md            # Implementation checklist (checkboxes only)
├── design.md           # Technical design (optional)
└── specs/
    └── <module>/
        └── spec.md     # Technical specifications
```

## Example: proposal.md

```markdown
# Add Rate Limiting

## Why
API endpoints have no rate limiting, causing service degradation
under high traffic. Production incident on 2025-03-12 confirmed this.

## What Changes
- Add rate limiter middleware to Express pipeline
- Configure per-route limits in config
- Add 429 response handling with Retry-After header
```

## Example: tasks.md

```markdown
- [ ] Add rate-limiter dependency
- [ ] Create middleware in src/middleware/rate-limit.ts
- [ ] Add per-route config to src/config/routes.ts
- [ ] Write tests for rate limiting behavior
- [ ] Update API docs with rate limit headers
- [ ] Run full quality gate pipeline
```

## Example: spec delta

```markdown
## ADDED Requirements
### Requirement: Rate Limiting
The system SHALL enforce per-route request limits.
The system MUST return 429 with Retry-After header when limit exceeded.

#### Scenario: Rate limit exceeded
Given a client has exceeded the configured request limit
When the client sends another request
Then the system responds with HTTP 429
And includes a Retry-After header with seconds until reset
```

## Best Practices

1. **Always create task first** — Document before implementing
2. **Keep tasks.md simple** — Only `- [ ]` checklist items, no explanations
3. **Put details in specs** — Technical requirements with SHALL/MUST keywords
4. **Validate before implementing** — `rulebook task validate` catches structural issues
5. **Archive when done** — Requires docs updated, tests written, tests passing
