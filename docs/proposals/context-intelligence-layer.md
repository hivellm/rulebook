# Proposal: Context Intelligence Layer

**Date**: 2026-03-13
**Status**: Draft
**Author**: AI-assisted planning
**Inspiration**: Context Mesh framework concepts, adapted to Rulebook architecture

---

## Summary

Add three interconnected features to Rulebook that capture **why** decisions were made, **what patterns** the team follows, and **what was learned** — closing the feedback loop between implementation and knowledge.

These features complement Rulebook's existing strengths (auto-detection, quality gates, Ralph loop) with a structured context layer that makes AI assistants more effective over time.

## Motivation

Rulebook excels at **automation and enforcement** (28 languages, 5 quality gates, Ralph loop). What's missing is a structured way to capture:

1. **Technical decisions** — "Why PostgreSQL and not MongoDB?" lives in Slack/heads, not in the repo
2. **Team patterns** — Coding conventions beyond linting rules, discoverable by AI assistants
3. **Post-implementation learnings** — Ralph captures learnings per iteration, but they're buried in history files

Context Mesh (github.com/jeftarmascarenhas/context-mesh) demonstrates these concepts as a pure methodology (Markdown files, no tooling). This proposal automates those ideas within Rulebook's existing CLI + MCP infrastructure.

## Analysis: Context Mesh vs Rulebook

| What Context Mesh does well | What Rulebook already has | Gap |
|---|---|---|
| ADRs with numbered format + alternatives | Nothing dedicated | **Decision Records** |
| `knowledge/patterns/` + `anti-patterns/` | Memory system (BM25+vector) | **Explicit knowledge base** |
| "Learn" phase post-implementation | Ralph learnings (per-iteration) | **Structured learn workflow** |
| Intent-first planning | `proposal.md` + `design.md` in tasks | Already covered |
| Manual Markdown workflow | CLI + MCP automation | Already superior |

## What NOT to copy

- No separate `context/` directory — Rulebook uses `.rulebook/` consistently
- No `intent/` phase — already covered by task proposals
- No manual prompt packs — Rulebook skills are superior
- No YAML frontmatter in templates — use `.metadata.json` sidecar (existing pattern)

---

## Feature 1: Decision Records (`rulebook decision`)

### Purpose

Track Architecture Decision Records (ADRs) with auto-numbering, status lifecycle, and cross-linking to tasks. Decisions are searchable via the memory system and referenced in AGENTS.md.

### Storage

```
.rulebook/decisions/
├── 001-use-postgres.md
├── 001-use-postgres.metadata.json
├── 002-api-rest-over-graphql.md
├── 002-api-rest-over-graphql.metadata.json
└── ...
```

### File Format

```markdown
# 1. Use PostgreSQL for Primary Database

**Status**: accepted
**Date**: 2026-03-13
**Related Tasks**: feature-auth, feature-data-layer

## Context

We need a relational database that supports JSONB for flexible schema
alongside strict relational data for user accounts and permissions.

## Decision

Use PostgreSQL 16+ as the primary database with Drizzle ORM.

## Alternatives Considered

- **SQLite**: Simpler setup but lacks concurrent write support needed for API server
- **MongoDB**: Good JSONB equivalent but adds operational complexity for relational queries
- **MySQL**: Viable but PostgreSQL's JSONB and extension ecosystem are stronger

## Consequences

- Team needs PostgreSQL expertise (most already have it)
- Can leverage pg_vector for future embedding search
- Migrations managed via Drizzle Kit
```

### Metadata (`.metadata.json`)

```json
{
  "id": 1,
  "slug": "use-postgres",
  "title": "Use PostgreSQL for Primary Database",
  "status": "accepted",
  "date": "2026-03-13",
  "relatedTasks": ["feature-auth", "feature-data-layer"],
  "supersededBy": null
}
```

### Type Definitions

```typescript
export type DecisionStatus = 'proposed' | 'accepted' | 'superseded' | 'deprecated';

export interface Decision {
  id: number;
  slug: string;
  title: string;
  status: DecisionStatus;
  date: string;
  context: string;
  decision: string;
  alternatives: string[];
  consequences: string;
  supersededBy?: number;
  relatedTasks?: string[];
}
```

### Manager Class

`src/core/decision-manager.ts` — follows TaskManager pattern:

| Method | Description |
|---|---|
| `create(title, options?)` | Auto-numbers, creates `.md` + `.metadata.json`, saves to memory |
| `list(status?)` | Reads directory, filters by status |
| `show(id)` | Returns full markdown content |
| `update(id, fields)` | Updates metadata and/or content |
| `supersede(oldId, newId)` | Marks old as superseded, links to new |
| `getNextId()` | Scans directory for max ID + 1 |

### CLI Commands

```bash
rulebook decision create "Use PostgreSQL"      --context "..." --related-task feature-auth
rulebook decision list                         --status accepted
rulebook decision show 1
rulebook decision supersede 1 5
```

### MCP Tools

| Tool | Parameters |
|---|---|
| `rulebook_decision_create` | `title`, `context?`, `decision?`, `alternatives?`, `consequences?`, `relatedTasks?`, `projectId?` |
| `rulebook_decision_list` | `status?`, `projectId?` |
| `rulebook_decision_show` | `id`, `projectId?` |
| `rulebook_decision_update` | `id`, `status?`, `context?`, `decision?`, `projectId?` |

### Generator Integration

- New template `templates/core/DECISIONS.md` explaining ADR format
- `generator.ts` adds "Decision Records" section to AGENTS.md with link to `.rulebook/specs/DECISIONS.md`
- Lists active decisions inline (title + status only) for AI context

### Memory Integration

On `create()`, auto-save to memory system:
```
type: 'decision'
title: "ADR-001: Use PostgreSQL"
tags: ['adr', 'database', 'postgres']
```

---

## Feature 2: Knowledge Base (`rulebook knowledge`)

### Purpose

Explicit patterns and anti-patterns that the generator auto-injects into AGENTS.md, making them discoverable by AI assistants without searching memory.

### Storage

```
.rulebook/knowledge/
├── patterns/
│   ├── repository-pattern.md
│   ├── repository-pattern.metadata.json
│   └── ...
└── anti-patterns/
    ├── god-object.md
    ├── god-object.metadata.json
    └── ...
```

### File Format

```markdown
# Repository Pattern for Data Access

**Category**: architecture
**Tags**: data-layer, separation-of-concerns

## Description

All database access goes through repository classes. Controllers and services
never import the ORM directly.

## Example

```typescript
// Good: via repository
class UserRepository {
  async findById(id: string): Promise<User | null> {
    return this.db.select().from(users).where(eq(users.id, id)).get();
  }
}

// Bad: direct ORM in controller
app.get('/users/:id', async (req, res) => {
  const user = await db.select().from(users).where(...); // Don't do this
});
```

## When to Use

- Any new data access layer
- Refactoring controllers with inline queries

## When NOT to Use

- Simple scripts or one-off migrations
- Prototype/spike code
```

### Type Definitions

```typescript
export type KnowledgeType = 'pattern' | 'anti-pattern';
export type KnowledgeCategory = 'architecture' | 'code' | 'testing' | 'security' | 'performance' | 'devops';

export interface KnowledgeEntry {
  id: string;
  type: KnowledgeType;
  title: string;
  category: KnowledgeCategory;
  description: string;
  example?: string;
  whenToUse?: string;
  whenNotToUse?: string;
  createdAt: string;
  tags: string[];
  source: 'manual' | 'ralph' | 'learn';
}
```

### Manager Class

`src/core/knowledge-manager.ts`:

| Method | Description |
|---|---|
| `add(type, title, options)` | Creates `<slug>.md` + `.metadata.json` in appropriate subdirectory |
| `list(type?, category?)` | Lists entries with optional filters |
| `show(id)` | Returns full markdown content |
| `remove(id)` | Deletes entry and metadata |
| `getForGenerator()` | Returns formatted section for AGENTS.md injection |

### CLI Commands

```bash
rulebook knowledge add pattern "Repository Pattern"      --category architecture
rulebook knowledge add anti-pattern "God Object"          --category code
rulebook knowledge list                                   --type pattern --category architecture
rulebook knowledge show repository-pattern
rulebook knowledge remove god-object
```

### MCP Tools

| Tool | Parameters |
|---|---|
| `rulebook_knowledge_add` | `type`, `title`, `category`, `description`, `example?`, `whenToUse?`, `whenNotToUse?`, `tags?`, `projectId?` |
| `rulebook_knowledge_list` | `type?`, `category?`, `projectId?` |
| `rulebook_knowledge_show` | `id`, `projectId?` |

### Generator Integration

`generator.ts` adds a "Project Knowledge" section to AGENTS.md:

```markdown
## Project Patterns

The following patterns are enforced in this project:

- **Repository Pattern** → [spec](/.rulebook/knowledge/patterns/repository-pattern.md)
- **Error Boundary Pattern** → [spec](/.rulebook/knowledge/patterns/error-boundary.md)

### Anti-Patterns to Avoid

- **God Object** → [details](/.rulebook/knowledge/anti-patterns/god-object.md)
```

This section is regenerated on every `rulebook update`, keeping AGENTS.md lean (titles + links only).

---

## Feature 3: Learn Phase (`rulebook learn`)

### Purpose

Structured capture of post-implementation learnings with promotion to patterns or decisions. Closes the feedback loop: implement → learn → codify → improve.

### Storage

Primary: memory system (searchable via BM25+vector)
Secondary: `.rulebook/learnings/<timestamp>-<slug>.md` (offline backup)

### Type Definitions

```typescript
export interface Learning {
  id: string;
  title: string;
  content: string;
  source: 'manual' | 'ralph' | 'task-archive';
  relatedTask?: string;
  relatedDecision?: number;
  tags: string[];
  createdAt: string;
  promotedTo?: {
    type: 'knowledge' | 'decision';
    id: string;
  };
}
```

### Manager Class

`src/core/learn-manager.ts` — thin facade over memory + KnowledgeManager + DecisionManager:

| Method | Description |
|---|---|
| `capture(title, content, options?)` | Saves to memory + `.rulebook/learnings/` |
| `fromRalph()` | Extracts learnings from Ralph iteration history, deduplicates, saves new ones |
| `list(limit?)` | Queries memory, falls back to directory listing |
| `promote(id, target)` | Creates knowledge entry or decision from learning |

### CLI Commands

```bash
rulebook learn capture                      # Interactive: title, content, tags
rulebook learn from-ralph                   # Auto-extract from Ralph history
rulebook learn list                         --limit 10
rulebook learn promote <id> knowledge       # → creates pattern/anti-pattern
rulebook learn promote <id> decision        # → creates ADR
```

### MCP Tools

| Tool | Parameters |
|---|---|
| `rulebook_learn_capture` | `title`, `content`, `tags?`, `relatedTask?`, `projectId?` |
| `rulebook_learn_list` | `limit?`, `projectId?` |
| `rulebook_learn_promote` | `id`, `target` (`knowledge` or `decision`), `title?`, `projectId?` |

### Task Archive Integration

Modify `taskArchiveCommand` in `commands.ts`:

```
$ rulebook task archive feature-auth
✓ Task archived successfully

Any learnings from this task? (y/N): y
Title: PostgreSQL JSONB gotcha with null arrays
Content: JSONB columns return null for empty arrays unless...
Tags: postgres, jsonb

✓ Learning captured (source: task-archive, related: feature-auth)
```

### Ralph Integration

`fromRalph()` reads `.rulebook/ralph/history/iteration-*.json`, extracts entries where `learnings` is non-empty, and saves each as a learning with `source: 'ralph'`.

### Promotion Flow

```
┌──────────┐    promote    ┌─────────────────┐
│ Learning │──────────────→│ Knowledge Entry  │
│          │               │ (pattern/anti)   │
│          │    promote    ├─────────────────┤
│          │──────────────→│ Decision (ADR)   │
└──────────┘               └─────────────────┘
```

---

## Implementation Plan

### Order

```
Phase 1 (parallel):
  ├── Feature 1: Decision Records
  └── Feature 2: Knowledge Base

Phase 2 (sequential):
  └── Feature 3: Learn Phase (depends on 1 + 2 for promote)

Phase 3:
  ├── Generator integration (AGENTS.md sections)
  ├── Skills (.claude/commands/rulebook-decision-*.md, etc.)
  └── Documentation updates
```

### Files Summary

| Action | Files |
|---|---|
| **Create** | `src/core/decision-manager.ts`, `src/core/knowledge-manager.ts`, `src/core/learn-manager.ts` |
| **Create** | `tests/decision-manager.test.ts`, `tests/knowledge-manager.test.ts`, `tests/learn-manager.test.ts` |
| **Create** | `templates/core/DECISIONS.md`, `templates/core/KNOWLEDGE.md` |
| **Modify** | `src/types.ts` — 3 interfaces, 3 type aliases |
| **Modify** | `src/index.ts` — 3 command groups |
| **Modify** | `src/cli/commands.ts` — 12 subcommands + task archive hook |
| **Modify** | `src/cli/prompts.ts` — learning capture prompts |
| **Modify** | `src/mcp/rulebook-server.ts` — 10 MCP tools |
| **Modify** | `src/core/generator.ts` — 2 new AGENTS.md sections |
| **Modify** | `src/core/workspace/project-worker.ts` — 3 new managers |

### Metrics

| Metric | Count |
|---|---|
| New source files | 3 |
| New test files | 3 |
| New templates | 2 |
| New MCP tools | 10 (total: 36) |
| New CLI commands | 12 |
| Estimated new tests | ~48 |
| Files modified | 7 |

### Testing Strategy

All three managers use the existing tmpdir + cleanup pattern from TaskManager tests:

- Decision: create, list, show, update, supersede, auto-numbering, error cases (~18 tests)
- Knowledge: add, list with filters, show, remove, getForGenerator output (~15 tests)
- Learn: capture, fromRalph extraction, list, promote to knowledge, promote to decision (~15 tests)

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Feature bloat in CLI | Commands are opt-in; no impact on existing `init`/`update` flow |
| AGENTS.md grows too large | Knowledge section uses titles + links only (same lean pattern) |
| Memory system duplication | Learnings live primarily in memory; `.rulebook/learnings/` is backup |
| Workspace complexity | All managers follow existing ProjectWorker pattern with `projectId` routing |

## Success Criteria

1. `rulebook decision create/list/show` works end-to-end (CLI + MCP)
2. `rulebook knowledge add` patterns appear in AGENTS.md after `rulebook update`
3. `rulebook learn promote` successfully creates knowledge entries and decisions
4. All new code has 95%+ test coverage
5. No regressions in existing 1086 tests
