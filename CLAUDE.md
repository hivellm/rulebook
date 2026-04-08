<!-- RULEBOOK:START v5.3.0 — DO NOT EDIT BY HAND. Regenerated on `rulebook update`.
     Put project-specific content in AGENTS.override.md or CLAUDE.local.md.
     Anything outside the RULEBOOK:START/END sentinels is preserved across updates. -->

# CLAUDE.md

Project managed by [@hivehub/rulebook](https://github.com/hivellm/rulebook).

**Read on demand** (not auto-imported, to save context):
- `AGENTS.md` — team-shared rules (read before non-trivial work)
- `AGENTS.override.md` — project overrides (read at session start)
- `.rulebook/STATE.md` — live task status
- `.rulebook/PLANS.md` — session scratchpad

Path-scoped rules in `.claude/rules/` load automatically when relevant files are touched.

## Critical rules (highest precedence)

1. **Read `AGENTS.md` and `AGENTS.override.md`** before making changes.
2. **Never revert or discard uncommitted work** — fix forward.
3. **Edit files sequentially**, not in parallel. 3+ files → decompose into 1–2 file sub-tasks.
4. **Diagnostic-first**: type-check before tests.
5. **Fail twice → escalate**: stop, research, or open a team. No third retry.
6. **Prefer MCP tools** (`mcp__rulebook__*`) over shell commands when equivalent exists.
7. **Never archive a task** without docs + tests passing.
8. **Use Rulebook MCP for tasks** — never `mkdir`/`Write` in `.rulebook/tasks/` (hook will block).

<!-- RULEBOOK:END -->
