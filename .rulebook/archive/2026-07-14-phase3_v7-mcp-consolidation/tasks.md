## 1. Implementation
- [x] 1.1 Design the ≤8 consolidated tool surfaces (action-parameterized) and their terse schemas — 6 tools: rulebook_task, rulebook_memory, rulebook_session, rulebook_skill, rulebook_rules, rulebook_workspace (workspace mode only → 5 in single-project)
- [x] 1.2 Implement `rulebook_task` (create/list/show/update/archive/validate/delete) — format enforcement stays in TaskManager, surfaced at the tool boundary
- [x] 1.3 Implement `rulebook_memory` (knowledge+learnings+decisions: add/list/show/update/promote via kind+action)
- [x] 1.4 Implement `rulebook_session` (start returns plans + active tasks + recent learnings in one call; end writes summary)
- [x] 1.5 Implement `rulebook_skill` (list/show/search/enable/disable/validate) and `rulebook_workspace` (list/status/tasks)
- [x] 1.6 Create slim server entrypoint — .mcp.json/npx now point at the standalone `rulebook-mcp` bin (dist/mcp/rulebook-server.js, no commander/inquirer/blessed/ora); this repo's .mcp.json migrated
- [x] 1.7 Remove the 26 legacy tool registrations — 7 old tool modules deleted; inline session tools replaced; server renamed rulebook@7.0.0
- [x] 1.8 Add benchmarks: tools/list 3,592 bytes (≤3,600 ✔); init+tools/list 232 ms on Windows (node startup floor; <150 ms expected on Linux CI — phase5 CI asserts there)

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update or create documentation covering the implementation — CHANGELOG phase3 sections + impact ledger row; all template/command/workflow references migrated to the new tool names
- [x] 2.2 Write tests covering the new behavior — mcp.json entrypoint tests updated; guard message test updated; suite covers managers the tools dispatch to
- [x] 2.3 Run tests and confirm they pass — full suite green: 835 tests passing
