## 1. Implementation
- [x] 1.1 Operator decision Q4 recorded — pinned npx in .mcp.json + opt-in fast path (see proposal.md)
- [x] 1.2 Local/user-scope fast-path entry with validation and update rewrite
- [x] 1.3 Bundled server entry + init benchmark — median of 3: 123 ms bundled vs 244 ms unbundled

## Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (CHANGELOG entry + affected guides/specs) — guides: docs/guides/MCP_SERVER_SETUP.md, docs/guides/WORKSPACE.md, README.md; CHANGELOG entry added by the main session at merge
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass (type-check → lint → tests)
