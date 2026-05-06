## 1. Implementation
- [ ] 1.1 Add fast-path bash short-circuit when prompt contains no terse trigger token
- [ ] 1.2 Consolidate stdin + project config + user config reads into one `node -e` call returning a single JSON blob
- [ ] 1.3 Replace the three existing `node -e` calls with bash extraction from the consolidated blob
- [ ] 1.4 Preserve `safe_write_flag` and `read_flag` symlink/size-cap safety unchanged
- [ ] 1.5 Mirror the change in `.claude/hooks/terse-mode-tracker.sh`

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass
