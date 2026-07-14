## 1. Implementation
- [x] 1.1 contextTip in `rulebook_task` archive and `rulebook_session` end responses (CONTEXT_TIP exported from v7-tools)
- [x] 1.2 Statusline context meter: STATUS_LINE_COMMAND renders `| ctx NN%` from stdin JSON `context_window.used_percentage`; pure sh/sed; graceful when absent
- [x] 1.3 Durable guidance line in templates/core/claude-md.md (compact ~60% at boundaries; /clear free after archive); repo CLAUDE.md regenerated
- [x] 1.4 Fix mergeClaudeMd block-replacement regex (hardcoded v5.3.0 → version-tolerant) found while regenerating; regression test added

## 2. Tail (mandatory — enforced by rulebook)
- [x] 2.1 Update or create documentation covering the implementation — CHANGELOG session-hygiene section; analysis docs already in docs/analysis/session-auto-cleanup/
- [x] 2.2 Write tests covering the new behavior — tests/session-hygiene.test.ts (5 tests: session-start payload keys, contextTip on end and archive, statusline render + graceful degrade) + merger regression test
- [x] 2.3 Run tests and confirm they pass — full suite green: 841 tests passing
