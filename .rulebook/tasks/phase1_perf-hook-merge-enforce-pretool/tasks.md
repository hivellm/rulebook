## 1. Implementation
- [ ] 1.1 Create `templates/hooks/enforce-pre-tool.sh` with consolidated stdin parse and the three deny rules inline
- [ ] 1.2 Preserve each original `permissionDecisionReason` string verbatim so downstream guidance does not change
- [ ] 1.3 Register the merged hook entry in the settings template (replacing the three existing entries)
- [ ] 1.4 Convert `enforce-no-deferred.sh`, `enforce-no-shortcuts.sh`, `enforce-mcp-for-tasks.sh` into one-line shims that exec `enforce-pre-tool.sh` for backwards compatibility
- [ ] 1.5 Mirror the new hook + updated settings into `.claude/hooks/` and `.claude/settings.json`
- [ ] 1.6 Update `rulebook update` migration logic so existing installations rewrite `settings.json` to point at the merged hook

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass
