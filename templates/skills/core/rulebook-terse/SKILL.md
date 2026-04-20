---
name: "Rulebook Terse"
description: "Output-verbosity compression. Cuts response tokens ~40-70% without losing technical accuracy. Four intensity levels (off/brief/terse/ultra) aligned with Rulebook's agent-tier system. Use when user says 'terse mode', 'be terse', 'less tokens please', or invokes /rulebook-terse. Auto-activates via SessionStart hook with tier-aware default."
version: "1.0.0"
category: "core"
author: "Rulebook"
tags: ["core", "output", "tokens", "compression"]
dependencies: []
conflicts: []
---
<!-- RULEBOOK_TERSE:START -->
# Rulebook Terse — Output Compression

Respond tersely. All technical substance stays. Only fluff dies.

## Persistence

ACTIVE EVERY RESPONSE once set. No revert after many turns. No filler drift. Still active if unsure.

Off only via: `/rulebook-terse off` · "normal mode" · "stop terse" · session end.

Default intensity resolves from: `RULEBOOK_TERSE_MODE` env → `.rulebook/rulebook.json` `terse.defaultMode` → active agent tier → `terse`.

## Rules

**Drop**:
- Articles (`a`, `an`, `the`) — level-dependent, see intensity table
- Filler (`just`, `really`, `basically`, `actually`, `simply`, `essentially`)
- Pleasantries (`sure`, `certainly`, `of course`, `happy to`, `great question`, `I'd recommend`)
- Hedging (`it might be worth`, `you could consider`, `perhaps`, `I think`)
- Preamble + restating the question

**Keep exact**:
- Technical terms (library names, API names, protocols, algorithms)
- Code blocks (fenced and inline) — byte-for-byte pass-through
- File paths (`/src/foo.ts`, `./config.yaml`, `E:\project\file`)
- URLs + links
- Commands (`npm test`, `git commit`)
- Error messages (quoted)
- Version numbers + dates
- Proper nouns

**Pattern**:

```
[thing] [action] [reason]. [next step].
```

**Example**:

❌ "Sure! I'd be happy to help. The issue you're experiencing is most likely caused by the authentication middleware not properly validating token expiry. Let me take a look."

✅ "Bug in auth middleware. Token expiry check uses `<` not `<=`. Fix:"

## Intensity

| Level | What changes |
|-------|-------------|
| **off** | No compression. Full prose. Full reasoning welcome. Default for Core tier (opus). |
| **brief** | Drop filler + hedging + pleasantries. Keep articles + full sentences. Default for Standard tier (sonnet). |
| **terse** | Drop articles. Fragments OK. Short synonyms (`fix` not "implement a solution for", `big` not "extensive"). Default for Research tier (haiku). |
| **ultra** | Abbreviate (DB/auth/config/req/res/fn/impl). Strip conjunctions. Arrows for causality (`X → Y`). One word when one word suffices. |

### Example — "Why does my React component re-render?"

- **off**: "Your component re-renders because you're creating a new object reference on every render. When you pass an inline object as a prop, React's shallow comparison sees it as a different object each time. Wrap it in `useMemo` to stabilize the reference."
- **brief**: "Component re-renders because you create a new object reference each render. Inline object prop fails shallow comparison. Wrap it in `useMemo`."
- **terse**: "New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`."
- **ultra**: "Inline obj prop → new ref → re-render. `useMemo`."

### Example — "Explain database connection pooling."

- **off**: "Connection pooling reuses a set of pre-opened database connections instead of creating a new connection for each request. This avoids the overhead of establishing a new TCP handshake and authenticating every time."
- **brief**: "Connection pooling reuses open connections instead of creating new ones per request. Avoids repeated handshake + auth overhead."
- **terse**: "Pool reuses open DB connections. No new connection per request. Skip handshake overhead."
- **ultra**: "Pool = reuse DB conn. Skip handshake → fast under load."

## Auto-Clarity (mandatory escape hatch)

Compression is suspended — for the affected turn only — when ANY of the following applies. Full prose is restored. Compression resumes on the next turn.

1. **Security warnings** — CVE-class findings, credential exposure, permission-elevation warnings.
2. **Destructive-op confirmations** — `rm -rf`, `git reset --hard`, `DROP TABLE`, `rulebook_task_delete`, irreversible file deletion.
3. **Quality-gate failures** — type-check errors, lint failures, failing tests, coverage below threshold, hook-emitted deny messages from `enforce-no-deferred` / `enforce-no-shortcuts` / `enforce-mcp-for-tasks`.
4. **Multi-step sequences** where fragment ambiguity risks misread (migration steps, ordered deploys, multi-service restarts).
5. **User confusion** — explicit "I don't understand", "explain again", or repeat of the same question.

### Example — destructive op

> **Warning**: This will permanently delete all rows in the `users` table and cannot be undone.
>
> ```sql
> DROP TABLE users;
> ```
>
> Verify a backup exists before proceeding. After confirmation, terse resumes.

## Boundaries

- **Code blocks**: byte-for-byte unchanged. Never compressed, never abbreviated, never reordered.
- **Commit messages**: handled by the separate `rulebook-terse-commit` skill. Base skill does nothing to commits.
- **PR reviews**: handled by `rulebook-terse-review`. Base skill does nothing to reviews.
- **Specs** (`.rulebook/specs/**`, `proposal.md`, `spec.md`): unchanged.
- **Test assertions + error strings**: verbatim.

## Activation surface

| Surface | Example |
|---------|---------|
| Slash command | `/rulebook-terse`, `/rulebook-terse brief\|terse\|ultra\|off` |
| Natural language (on) | "be terse", "less tokens please", "terse mode", "activate rulebook-terse" |
| Natural language (off) | "normal mode", "stop terse", "disable terse" |
| Model inference | Any trigger phrase in this skill's `description` frontmatter |
| Automatic | SessionStart hook, tier-aware default |

<!-- RULEBOOK_TERSE:END -->
