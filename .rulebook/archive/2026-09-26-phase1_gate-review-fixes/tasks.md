## 1. Implementation
- [x] 1.1 A — `rulebook update` preserves `installedAt` and `integrations` (pure `rebuildConfigOnUpdate`)
- [x] 1.2 B — TypeSafe block in init/update runs only when Claude Code is detected
- [x] 1.3 C — `rulebook_gate` creates nothing in a project without `.rulebook/rulebook.json`
- [x] 1.4 D — CLAUDE.md routing restores "refactors" within the 1600-token budget
- [x] 1.5 E — gate state enforces the 8 KB hard cap by UTF-8-safe byte-slicing the prompt
- [x] 1.6 F — Jev choice answers validated against the question's criteria keys
- [x] 1.7 G — orchestration spec lists the answer-to-open-question follow-on rule
- [x] 1.8 H — TypeSafe rule token check uses tiktoken (≤ 90)
- [x] 1.9 I — `gate --check` honours `RULEBOOK_GATE=off` before reading `.env`
- [x] 1.10 J — v7-budgets comment records the measured 4869/4900
- [x] 1.11 K — `.env` unquoted values drop a trailing inline comment

## 2. Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (spec/template text: orchestration.md, claude-md.md)
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass
