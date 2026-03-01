## 1. Implementation
- [ ] 1.1 Create `templates/ralph/` directory with .sh scripts (init, run, status, pause, history)
- [ ] 1.2 Create matching .bat scripts for Windows cross-platform support
- [ ] 1.3 Add script installation logic to generator.ts (copy to `.rulebook/scripts/`)
- [ ] 1.4 Hook script installation into `init` and `update` commands in commands.ts
- [ ] 1.5 Add `.rulebook/scripts/` to .gitignore template (scripts are regenerated)

## 2. Testing
- [ ] 2.1 Write unit tests for script template generation
- [ ] 2.2 Write tests for script installation during init/update
- [ ] 2.3 Verify cross-platform script execution

## 3. Documentation
- [ ] 3.1 Update RALPH.md template with shell script usage
- [ ] 3.2 Update CHANGELOG for v4.0.0
