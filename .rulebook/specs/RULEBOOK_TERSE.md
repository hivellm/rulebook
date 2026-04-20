<!-- RULEBOOK_TERSE:START -->
# Rulebook Terse Mode

Output-verbosity compression for AI coding agents. Reduces response tokens without losing technical accuracy via a structurally-enforced skill backed by Claude Code SessionStart + UserPromptSubmit hooks.

Supersedes the advisory `TOKEN_OPTIMIZATION.md` tier table. The tier table is retained as a lookup for default intensity assignment, but output-style enforcement lives here.

## Scope

- **In scope**: agent output (reports, summaries, explanations, mid-turn narration).
- **Out of scope**: code blocks, test assertions, commit messages (unless via `rulebook-terse-commit`), PR reviews (unless via `rulebook-terse-review`), spec files, error messages.

## Intensity levels

Four levels. Level persists across turns until explicitly changed or session end. Aligned with Rulebook's existing agent-tier system.

| Level | Default for | What changes |
|-------|-------------|--------------|
| `off` | Core tier (opus — architecture, complex bugs) | No compression. Full prose. Full reasoning welcome. |
| `brief` | Standard tier (sonnet — implementation, tests) | Drop filler + hedging + pleasantries. Keep articles + full sentences. Professional but tight. |
| `terse` | Research tier (haiku — read-only exploration, docs) | Drop articles. Fragments OK. Short synonyms. Pattern: `[thing] [action] [reason]. [next].` |
| `ultra` | Non-interactive (CI, automation) | Abbreviate (DB/auth/config/req/res/fn). Strip conjunctions. Arrows for causality (X → Y). |

## Auto-clarity (mandatory escape hatch)

Terse compression MUST be dropped — temporarily, for the affected turn only — in five contexts:

1. **Security warnings** (CVE-class findings, credential exposure, permission warnings).
2. **Destructive-op confirmations** (`rm`, `git reset --hard`, `DROP TABLE`, `rulebook_task_delete`, irreversible file deletion).
3. **Quality-gate failures** from the `enforce-*` hooks (type-check, lint, tests, coverage < 95%).
4. **Multi-step sequences** where fragment ambiguity risks misread (ordered deploys, migration steps).
5. **User confusion** — explicit "I don't understand" or repeating the same question.

After the clear part ends, compression resumes on the next turn.

## Boundaries

- **Code**: byte-for-byte pass-through. No compression inside fenced blocks.
- **Commit messages**: see `rulebook-terse-commit` skill. Base terse skill does not touch commits.
- **PR reviews**: see `rulebook-terse-review` skill.
- **Error messages**: quoted exact.
- **File paths, URLs, commands, version numbers**: unchanged.

## Activation surface

- Slash commands: `/rulebook-terse`, `/rulebook-terse brief|terse|ultra|off`, `/rulebook-terse-commit`, `/rulebook-terse-review`.
- Natural language (on): "be terse", "less tokens please", "activate rulebook-terse", "terse mode".
- Natural language (off): "normal mode", "stop terse", "disable terse".
- Model-inferred via SKILL.md `description` frontmatter triggers.
- Automatic via SessionStart hook when default intensity ≠ `off`.

## Persistence

Once set, the active level applies to every subsequent model response until:

- The user explicitly changes or disables it via one of the surfaces above.
- The session ends.

The UserPromptSubmit hook emits a short (~45 token) attention anchor on every user message to prevent style drift when other plugins inject competing instructions mid-conversation.

## Tier-aware defaults

When no explicit mode is set, the SessionStart hook selects a default based on the active agent tier:

- `research` / haiku → `terse`
- `standard` / sonnet → `brief`
- `core` / opus → `off`
- `team-lead` → `brief`

User overrides via `/rulebook-terse <level>` persist for the remainder of the session.

## Safety invariants

Mode state lives in a flag file at `$RULEBOOK_CONFIG_DIR/.rulebook-terse-mode` (project-local). All reads and writes MUST use the `safe-flag-io` module which enforces:

- `lstat` check refuses symlinks at target and immediate parent.
- `O_NOFOLLOW` on open where supported.
- Atomic temp + rename on write.
- `0600` permissions.
- Size cap (`MAX_FLAG_BYTES = 32`; longest valid value is `review` at 6 bytes).
- Whitelist validation against `VALID_MODES`.
- Silent-fail on all filesystem errors — flag is best-effort; a failed flag never blocks session start.

These defenses close two local-attack surfaces on predictable user-owned paths:

- **Clobber**: attacker symlinks flag to another file; next write destroys it.
- **Exfil**: attacker symlinks flag to `~/.ssh/id_rsa`; next read injects the private key into model context.

## Evaluation contract

All skill behavior changes MUST be measured against a three-arm harness:

| Arm | System prompt |
|-----|--------------|
| `baseline` | (none) |
| `terse` | `Answer concisely. No preamble, no restating the question.` |
| `rulebook-terse` | `Answer concisely.` + content of the active SKILL.md |

Honest delta is reported as **`rulebook-terse` vs `terse`**. A skill whose average lift over `terse` is < 15% is flagged for review.

Snapshots committed under `evals/snapshots/`. Offline measurement via `tiktoken` in CI; snapshot regeneration requires `ANTHROPIC_API_KEY`.

## Compression companion

`rulebook compress <file>` reduces memory-file input tokens (prose portions of `CLAUDE.md`, `AGENTS.override.md`, `.rulebook/PLANS.md`, `.rulebook/knowledge/**`). Preserves code, URLs, file paths, commands, headings, dates, and version numbers byte-for-byte. Writes backup to `<name>.original.md`. Retries up to 2× on validator failure; hard-fails after.

Base terse skill reduces what the agent **speaks**; `rulebook compress` reduces what the agent **reads**. Compose independently.

<!-- RULEBOOK_TERSE:END -->
