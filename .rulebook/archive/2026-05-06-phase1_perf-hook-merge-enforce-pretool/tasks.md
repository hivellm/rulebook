## 1. Implementation
- [x] 1.1 Create `templates/hooks/enforce-pre-tool.sh` with consolidated stdin parse and the three deny rules inline
- [x] 1.2 Preserve each original `permissionDecisionReason` string verbatim so downstream guidance does not change
- [x] 1.3 Register a single merged hook entry in `src/core/claude-settings-manager.ts` (replacing the three existing entries)
- [x] 1.4 Delete `enforce-no-deferred.sh`, `enforce-no-shortcuts.sh`, `enforce-mcp-for-tasks.sh` from both `templates/hooks/` and `.claude/hooks/` (no shims)
- [x] 1.5 Mirror the new hook into `.claude/hooks/enforce-pre-tool.sh`
- [x] 1.6 Add `LEGACY_SIGNATURES` cleanup pass in the settings-manager so `rulebook update` strips stale entries from older versions automatically

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update or create documentation covering the implementation (CHANGELOG.md 5.6.0 entry)
- [x] 2.2 Write tests covering the new behavior (`tests/enforce-pre-tool-shell.test.ts` 13 tests + `tests/claude-settings-manager-enforce.test.ts` 8 tests)
- [x] 2.3 Run tests and confirm they pass (21/21 across the two new files)
