## 1. Implementation
- [x] 1.1 Add fast-path bash short-circuit when prompt contains no terse trigger token
- [x] 1.2 Consolidate stdin + project config + user config reads into one `node -e` call (returns cwd + pre-resolved decision)
- [x] 1.3 Replace the three existing `node -e` calls with bash extraction (single `sed` per line — no JSON re-parse)
- [x] 1.4 Preserve `safe_write_flag` and `read_flag` symlink/size-cap safety unchanged
- [x] 1.5 Mirror the change in `templates/hooks/terse-mode-tracker.sh`

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass
