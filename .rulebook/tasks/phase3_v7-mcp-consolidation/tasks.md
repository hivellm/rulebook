## 1. Implementation
- [ ] 1.1 Design the ≤8 consolidated tool surfaces (action-parameterized) and their terse schemas; document in RULEBOOK_MCP.md
- [ ] 1.2 Implement `rulebook_task` (create/list/show/update/archive/validate) with format enforcement at creation time
- [ ] 1.3 Implement `rulebook_memory` (knowledge+learnings+decisions: add/list/search/promote)
- [ ] 1.4 Implement `rulebook_session` (start returns state+plans+knowledge digest in one call; end writes summary)
- [ ] 1.5 Implement `rulebook_specs` (list/show) and workspace variants where needed
- [ ] 1.6 Create slim server entrypoint with lazy imports (no inquirer/blessed/ora/chokidar); point `.mcp.json` generation at it
- [ ] 1.7 Remove the 26 legacy tool registrations
- [ ] 1.8 Add benchmarks: tools/list ≤3,600 bytes; init+tools/list <150 ms

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass
