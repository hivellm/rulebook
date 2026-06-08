## 1. Derive the used set (data-driven, do first)

- [x] 1.1 Built the keep-list from enabled skills across all 8 projects, the installed `.claude/agents`, the AGENT_REGISTRY delegation table, and workflow `agentType` references
- [x] 1.2 Confirmed the language/core/dev/cli skills are heavily enabled (no skill over-provisioning post IDE-removal); scoped the prune to agents + niche modules
- [x] 1.3 Recorded keep (11 agents) vs remove (10 role agents + 5 orphan subdirs + 4 niche modules)

## 2. Prune the library

- [x] 2.1 Skills kept (heavily used); removed only niche MCP module skills (figma/grafana/notion/atlassian)
- [x] 2.2 Removed 10 unused agent templates + 5 orphaned project-type subdirs
- [x] 2.3 Trimmed `AGENT_REGISTRY`, the `ModuleId` union, and the init module prompt — no dangling references

## 3. Install path

- [x] 3.1 Confirmed `installAgentDefinitions` copies only flat `*.md` (subdirs were never installed)
- [x] 3.2 type-check + lint + full suite green after the prune

## 4. Tail (mandatory — enforced by rulebook v5.3.0)

- [x] 4.1 Update or create documentation covering the implementation
- [x] 4.2 Write tests covering the new behavior
- [x] 4.3 Run tests and confirm they pass
