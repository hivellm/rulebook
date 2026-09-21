## 1. Directive
- [x] 1.1 prohibitions.md: Tier 1 #7 "No OS-level scheduling"; one-line clause in claude-md.md and agents-lean.md within the context budget

## 2. Enforcement
- [x] 2.1 templates/hooks/no-os-scheduling.sh: PreToolUse guard (Bash command match + Edit/Write path match), allow fast path
- [x] 2.2 claude-settings-manager: osSchedulingGuard desire (install script, upsert/remove hook); init/update/claude enable it

## 3. Tail (docs + tests — check or waive with tailWaiver)
- [x] 3.1 Update or create documentation covering the implementation
- [x] 3.2 Write tests covering the new behavior
- [x] 3.3 Run tests and confirm they pass
