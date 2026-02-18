# Proposal: Reorganize Rulebook Directory and Create MCP Tool Skills

## Why

The `/rulebook/` directory currently mixes two different concerns in the same level:

1. **Generated spec/rule files** (TYPESCRIPT.md, RULEBOOK.md, QUALITY_ENFORCEMENT.md, GIT.md, etc.) — these are reference documentation for AI agents
2. **Task management** (`tasks/` directory) — project task tracking

This flat structure makes it hard to distinguish between rule files and other content. Moving the spec/rule markdown files into a dedicated `/rulebook/specs/` subdirectory creates a cleaner hierarchy that separates concerns.

Additionally, the project has 13+ MCP tools (task management, skill management) but only a single generic `rulebook-mcp` skill that lists all tools together. Each MCP tool group should have its own dedicated Claude Code skill so AI agents can discover and use individual tools more effectively. This follows the modular skills pattern already established in the project (e.g., `rulebook-task-management`, `rulebook-quality-gates`).

Current structure:
```
rulebook/
├── RULEBOOK.md              ← mixed with tasks/
├── TYPESCRIPT.md
├── QUALITY_ENFORCEMENT.md
├── GIT.md
├── AGENT_AUTOMATION.md
├── RUST.md
├── VECTORIZER.md
├── CONTEXT7.md
├── RULEBOOK_MCP.md
└── tasks/                   ← task management
```

Proposed structure:
```
rulebook/
├── specs/                   ← all generated rule/spec files
│   ├── RULEBOOK.md
│   ├── TYPESCRIPT.md
│   ├── QUALITY_ENFORCEMENT.md
│   ├── GIT.md
│   ├── AGENT_AUTOMATION.md
│   ├── RUST.md
│   ├── VECTORIZER.md
│   ├── CONTEXT7.md
│   └── RULEBOOK_MCP.md
└── tasks/                   ← unchanged
```

## What Changes

### 1. Directory Reorganization
- **ADDED** `/rulebook/specs/` subdirectory for all generated spec/rule markdown files
- **MODIFIED** `src/core/generator.ts` — update `writeModularFile()` to write to `/rulebook/specs/` instead of `/rulebook/`
- **MODIFIED** AGENTS.md reference paths from `/${rulebookDir}/FILE.md` to `/${rulebookDir}/specs/FILE.md`
- **MOVED** All 9 existing `.md` files from `/rulebook/` root to `/rulebook/specs/`

### 2. MCP Tool Skills for Claude Code
- **ADDED** `skills/rulebook-task-create/SKILL.md` — dedicated skill for `rulebook_task_create` tool
- **ADDED** `skills/rulebook-task-list/SKILL.md` — dedicated skill for `rulebook_task_list` tool
- **ADDED** `skills/rulebook-task-show/SKILL.md` — dedicated skill for `rulebook_task_show` tool
- **ADDED** `skills/rulebook-task-update/SKILL.md` — dedicated skill for `rulebook_task_update` tool
- **ADDED** `skills/rulebook-task-validate/SKILL.md` — dedicated skill for `rulebook_task_validate` tool
- **ADDED** `skills/rulebook-task-archive/SKILL.md` — dedicated skill for `rulebook_task_archive` tool
- **ADDED** `skills/rulebook-task-delete/SKILL.md` — dedicated skill for `rulebook_task_delete` tool
- **ADDED** `skills/rulebook-skill-list/SKILL.md` — dedicated skill for `rulebook_skill_list` tool
- **ADDED** `skills/rulebook-skill-show/SKILL.md` — dedicated skill for `rulebook_skill_show` tool
- **ADDED** `skills/rulebook-skill-enable/SKILL.md` — dedicated skill for `rulebook_skill_enable` tool
- **ADDED** `skills/rulebook-skill-disable/SKILL.md` — dedicated skill for `rulebook_skill_disable` tool
- **ADDED** `skills/rulebook-skill-search/SKILL.md` — dedicated skill for `rulebook_skill_search` tool
- **ADDED** `skills/rulebook-skill-validate/SKILL.md` — dedicated skill for `rulebook_skill_validate` tool

### 3. Generator Updates
- **MODIFIED** `src/core/generator.ts` — update default output path for modular files from `/${rulebookDir}/` to `/${rulebookDir}/specs/`
- **MODIFIED** `src/core/generator.ts` — update all reference section paths in generated AGENTS.md
- **MODIFIED** `src/core/migrator.ts` — handle migration from old flat layout to new specs/ layout

### 4. Configuration Updates
- **MODIFIED** `.rulebook` config — no changes needed (rulebookDir stays as `rulebook`, generator handles the `specs/` subpath internally)

## Impact

- **Affected specs**:
  - `specs/core/spec.md` (directory reorganization, generator path changes)
  - `specs/skills/spec.md` (new MCP tool skills)

- **Affected code**:
  - `src/core/generator.ts` (output paths and reference paths)
  - `src/core/migrator.ts` (migration from flat to specs/ layout)
  - `AGENTS.md` (regenerated with new paths)

- **Breaking change**: PARTIAL — Existing projects will need to run `rulebook update` to migrate files from `/rulebook/*.md` to `/rulebook/specs/*.md`. The migrator will handle this automatically. Old paths will be detected and migrated.

- **User benefit**:
  - Cleaner directory organization separating specs from tasks
  - Individual MCP tool skills allow AI agents to discover and use tools more precisely
  - Better skill granularity following the Claude Code skills pattern
  - Each tool has its own documentation with input schema, examples, and error handling
