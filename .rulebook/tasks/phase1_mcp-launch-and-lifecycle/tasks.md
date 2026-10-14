## 1. Implementation
- [ ] 1.1 Single entry writer; remove the legacy mcp-server form from mcp.ts and legacy-migrator.ts
- [ ] 1.2 Pinned version in generated entries; update rewrites @latest / legacy entries
- [ ] 1.3 stdin end/close → process.exit, with a test that holds a timer open
- [ ] 1.4 Tool annotations for every rulebook MCP action
- [ ] 1.5 v7-budgets test spawns the generated launch command, not node dist

## Tail (docs + tests — check or waive with tailWaiver)
- [ ] 2.1 Update or create documentation covering the implementation (CHANGELOG entry + affected guides/specs)
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass (type-check → lint → tests)
