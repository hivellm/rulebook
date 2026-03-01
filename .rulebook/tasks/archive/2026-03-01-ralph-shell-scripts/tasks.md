## 1. Implementation
- [x] 1.1 Create `templates/ralph/` directory with .sh scripts (init, run, status, pause, history)
- [x] 1.2 Create matching .bat scripts for Windows cross-platform support
- [x] 1.3 Add script installation logic to generator.ts (copy to `.rulebook/scripts/`)
- [x] 1.4 Hook script installation into `init` and `update` commands in commands.ts
- [x] 1.5 Add `.rulebook/scripts/` to .gitignore template (scripts are regenerated)

## 2. Testing
- [x] 2.1 Write unit tests for script template generation
- [x] 2.2 Write tests for script installation during init/update
- [x] 2.3 Verify cross-platform script execution

## 3. Documentation
- [x] 3.1 Update RALPH.md template with shell script usage
- [x] 3.2 Update CHANGELOG for v4.0.0

## Status: ✅ COMPLETE

All implementation tasks completed. Ralph shell scripts are installed to `.rulebook/scripts/` during init/update, providing AI agents direct shell access to Ralph without MCP dependency.

**Verification:**
- ✅ 10 script files created (5 pairs .sh/.bat)
- ✅ `src/core/ralph-scripts.ts` implements `installRalphScripts()`
- ✅ Hooks added to init (line 412) and update (line 1715) commands
- ✅ Cross-platform support with chmod 0o755 on Unix
- ✅ 9 tests passing in ralph-scripts.test.ts
- ✅ Documentation updated in CHANGELOG.md
