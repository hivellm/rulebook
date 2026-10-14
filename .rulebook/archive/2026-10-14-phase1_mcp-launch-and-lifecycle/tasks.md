## 1. Implementation
- [x] 1.1 Single entry writer; remove the legacy mcp-server form from mcp.ts and legacy-migrator.ts
- [x] 1.2 Pinned version in generated entries; update rewrites @latest / legacy entries
- [x] 1.3 stdin end/close → process.exit, with a test that holds a timer open
- [x] 1.4 Tool annotations for every rulebook MCP action
- [x] 1.5 v7-budgets test spawns the generated launch command, not node dist

## Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (CHANGELOG entry + affected guides/specs) — guides: docs/guides/MCP_SERVER_SETUP.md, docs/guides/WORKSPACE.md, README.md; CHANGELOG entry added by the main session at merge
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass (type-check → lint → tests)
