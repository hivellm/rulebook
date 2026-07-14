# 04 — v7.0.0 Concrete Specification

Layer-by-layer spec implementing the principles in
[03-design-principles.md](03-design-principles.md). Draft directive text (the
actual v7 CLAUDE.md and rules file) lives in
[06-draft-directives.md](06-draft-directives.md).

## 4.1 Context layer (target: ≤2,500 tokens/session, −83%)

- **CLAUDE.md**: single file, ≤60 lines. Contents: project identity, build/test
  commands, git safety list, 5–8 project values (one line each), pointer to
  `rulebook` MCP for tasks. No imports of rule essays.
- **AGENTS.md**: the current `--lean` mode becomes the **only** mode — a <3 KB
  index referencing `.rulebook/specs/` for detail. Fat mode is deleted.
- **`.claude/rules/`**: 19 files → **1 file** (`rulebook.md`, ≤40 lines) holding
  only the non-derivable, non-contradictory core: git safety, no-secrets,
  quality-gate command, task-format pointer. Deleted outright:
  sequential-editing, task-decomposition, multi-agent-teams,
  respect-handoff-trigger, incremental-*, follow-task-sequence, no-deferred,
  full-task-no-questions, fail-twice-escalate, research-first, session-workflow
  (their *values* survive as single lines; their *procedures* are deleted).
- **Karpathy guidelines**: kept — once, as 4 lines in CLAUDE.md, not as a skill
  plus two full copies.

## 4.2 Hooks layer (target: 0 spawns on hot paths)

- **Delete**: Stop (handoff), UserPromptSubmit (terse), SessionStart ×4 (handoff
  resume, compact reinject, terse activate, update check — update check moves to
  the CLI itself), **PreToolUse Agent (teams enforcement — P0)**.
- **Keep at most one** PreToolUse guard, matcher-scoped to `Edit|Write`, that
  checks **path only** (deny manual writes of `.rulebook/tasks/*/proposal.md` /
  `.metadata.json` when the file doesn't exist). Pure bash, no node, no content
  inspection. Content rules (no-TODO, no-stub) move to the **quality gate**
  (lint rule / pre-commit) where real parsers see code instead of regex payloads
  and the model receives compiler-style feedback instead of tool denials.
- All surviving hooks ship `.ps1` equivalents and are benchmarked <10 ms.

## 4.3 MCP layer (target: ≤8 tools, ≤900 schema tokens, <150 ms startup)

- **Consolidate 26 → 8 tools**, action-parameterized:
  `rulebook_task` (create/list/show/update/archive/validate),
  `rulebook_memory` (knowledge + learnings + decisions: add/list/search/promote),
  `rulebook_session` (start/end), `rulebook_specs` (list/show), plus workspace
  variants where needed. Schemas terse: one-line descriptions.
- `.mcp.json` points at the **slim entrypoint** (`dist/mcp/rulebook-server.js`)
  with lazy imports — no CLI dependencies (inquirer/blessed/ora/chokidar) in the
  server process.
- Enforcement moves here: `rulebook_task` refuses malformed tasks at creation
  time (free — it's already a tool call), replacing the PreToolUse content regex.

## 4.4 Process layer (the big one)

- **Task ceremony becomes proportional.** Tasks are **opt-in for multi-session
  work**, not mandatory for every change. Small fixes need zero Rulebook calls.
  `rulebook_session start` returns *everything* in one call (state + plans +
  relevant knowledge digest), replacing 4–5 separate lookups.
- **Orchestration is the model's choice (P0).** One advisory line — "Prefer
  subagents for parallel or context-heavy work" — replaces the delegation table,
  the teams mandate, and the background-agent hook. Nothing denies or reroutes
  how Opus/Fable fan out subagents.
- **Knowledge capture is opportunistic**, not mandatory-per-task: one line
  inviting capture when something non-obvious was learned.
- **Handoff/terse/teams-enforcement/token-tier subsystems: deleted.** PLANS.md
  survives as an optional scratchpad.

## 4.5 Assets layer

- **Agents**: ship **0** by default (harness natives cover all 12).
  `rulebook agents add <role>` remains for users who want them.
- **Skills**: keep only Rulebook-specific ones (task-create/apply/archive flows,
  analysis). Generic engineering skills (debug/refactor/perf/review/
  security-audit/api-design/db-design/accessibility/migrate/deploy/docs) are
  deleted — they duplicate native harness skills and pad the skills list.
- **Workflows**: opt-in (`rulebook workflows add`), not default-installed.

## 4.6 Permissions layer (full autonomy by default — F-011)

v7 generates a **full-autonomy permission profile** so the model never stalls
waiting for a human click. Guardrails live in the directive layer (git-safety
values the model follows) and in the quality gate — not in permission prompts.

Generated `.claude/settings.json` permissions:

```json
{
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": [
      "Bash(*)", "Read(*)", "Edit(*)", "Write(*)",
      "Glob(*)", "Grep(*)", "Agent(*)",
      "WebFetch(*)", "WebSearch", "TodoWrite",
      "mcp__rulebook"
    ]
  }
}
```

- `acceptEdits` + the allow rules above remove prompts for everything the model
  routinely does (edits, shell, subagents, web, rulebook MCP).
- Rulebook only ever **adds** rules and only sets `defaultMode` when absent —
  user-authored permissions and stricter enterprise policies always win.
- Users who want prompts back tighten `AGENTS.override.md`-style via their own
  settings; Rulebook never re-tightens on update.

## 4.7 Migration

`rulebook update` on a v6 project:

1. Rewrites CLAUDE.md/AGENTS.md to lean form, preserving AGENTS.override.md.
2. Removes all retired hook entries from `.claude/settings.json` via the existing
   signature mechanism (extend `LEGACY_SIGNATURES` with all v6 hooks).
3. Deletes retired rule/agent/skill files it owns; never touches user files.
4. Migrates `.mcp.json` to the slim server entrypoint.
5. Prints a diff summary; `--dry-run` supported.
