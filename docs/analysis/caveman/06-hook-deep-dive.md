# 06 — Hook Deep Dive: The Actual Output-Reduction Mechanism

This report focuses on the question: **how do Caveman’s hooks actually reduce model output, and what would an equivalent look like in Rulebook?**

The analysis is grounded in the real source of Caveman’s three hook files (`caveman-activate.js`, `caveman-mode-tracker.js`, `caveman-config.js`) and mapped against Rulebook’s existing hook system (`claude-settings-manager.ts`, `.claude/hooks/*`, `templates/hooks/*`).

## Part A — How the mechanism actually works

Three files, one flag file, two Claude Code hook events. That is the entire machine.

```
┌──────────────────────────────────────────────────────────────────────┐
│ SessionStart hook  (runs once per session)                            │
│   caveman-activate.js                                                 │
│                                                                        │
│   1. safeWriteFlag($CLAUDE_CONFIG_DIR/.caveman-active, mode)          │
│   2. fs.readFileSync(skills/caveman/SKILL.md)                         │
│      → strip YAML frontmatter                                          │
│      → filter intensity table to active level's row only               │
│      → filter examples to active level's line only                     │
│   3. process.stdout.write(filtered_skill_body)                        │
│         ↑                                                              │
│         Claude Code treats stdout as `additionalContext` and          │
│         injects it into the model's system context INVISIBLY.         │
│         User never sees it. Model sees it.                            │
└──────────────────────────────────────────────────────────────────────┘

                                   │
                                   ▼

┌──────────────────────────────────────────────────────────────────────┐
│ UserPromptSubmit hook  (runs on every user message)                   │
│   caveman-mode-tracker.js                                             │
│                                                                        │
│   1. Parse prompt:                                                     │
│        "/caveman ultra"     → safeWriteFlag(flag, 'ultra')             │
│        "activate caveman"   → safeWriteFlag(flag, default)             │
│        "stop caveman"       → unlink(flag)                             │
│        "normal mode"        → unlink(flag)                             │
│                                                                        │
│   2. mode = readFlag(flag)  ← size-capped, symlink-safe, whitelisted   │
│                                                                        │
│   3. If mode is active and persistent:                                 │
│        emit JSON on stdout:                                            │
│        { hookSpecificOutput: {                                         │
│            hookEventName: "UserPromptSubmit",                          │
│            additionalContext: "CAVEMAN MODE ACTIVE (ultra). Drop       │
│              articles/filler/pleasantries/hedging. Fragments OK.       │
│              Code/commits/security: write normal." } }                 │
│                                                                        │
│        ↑ ~40 tokens, injected invisibly on EVERY user message.         │
│        This is the per-turn attention anchor.                          │
└──────────────────────────────────────────────────────────────────────┘
```

### The exact filtering Caveman does on SKILL.md

`caveman-activate.js` lines 56–77 — this is the part that actually trims the SKILL.md before injection:

```javascript
const body = skillContent.replace(/^---[\s\S]*?---\s*/, '');

const filtered = body.split('\n').reduce((acc, line) => {
  // Intensity table rows start with | **level** |
  const tableRowMatch = line.match(/^\|\s*\*\*(\S+?)\*\*\s*\|/);
  if (tableRowMatch) {
    // Keep only the active level's row (header/separator already passed through)
    if (tableRowMatch[1] === modeLabel) acc.push(line);
    return acc;
  }

  // Example lines start with "- level:" — keep only the active level's line
  const exampleMatch = line.match(/^- (\S+?):\s/);
  if (exampleMatch) {
    if (exampleMatch[1] === modeLabel) acc.push(line);
    return acc;
  }

  acc.push(line);
  return acc;
}, []);
```

**What this saves.** The full SKILL.md is ≈ 100 lines with six intensity rows and six example rows per concept. Filtered to one active level, roughly **60% of the SKILL.md body is dropped before injection** into context. Only the rules, the active level’s table row, and the active level’s examples survive. The model learns the current register, not all six.

### Why the per-turn reinforcement is ~40 tokens, not ~400

The UserPromptSubmit reinforcement is **not** the full SKILL.md re-injected. It is a deliberately short attention anchor:

```
CAVEMAN MODE ACTIVE (ultra). Drop articles/filler/pleasantries/hedging.
Fragments OK. Code/commits/security: write normal.
```

Rationale from the hook comments:

> The SessionStart hook injects the full ruleset once, but models lose it
> when other plugins inject competing style instructions every turn.
> This keeps caveman visible in the model's attention on every user message.

One-shot injection at session start teaches the register. A short repeated reminder keeps the register under attention pressure from competing injections. Re-injecting the full ruleset every turn would waste ~500 tokens × N turns; a 40-token anchor costs ~40 tokens × N turns and achieves the same effect because the model already learned the rules.

### The security-critical piece: `safeWriteFlag` + `readFlag`

The flag file lives at a predictable user-writable path (`$CLAUDE_CONFIG_DIR/.caveman-active`). Without precautions, a local unprivileged process with write access to that directory could:

**Attack 1 — clobber a user file.** Replace the flag with a symlink to `~/.ssh/authorized_keys`. The next write clobbers that file with `"full"`.

**Attack 2 — exfiltrate via model context.** Replace the flag with a symlink to `~/.ssh/id_rsa`. The next `readFlag` reads that file and the reinforcement hook injects its contents into `additionalContext`. The model now sees the private key in its context, and any subsequent turn could leak it into output, logs, or tool calls.

`safeWriteFlag` and `readFlag` together close both attacks:

| Defense | Write side | Read side |
|---|---|---|
| `lstat` target — refuse if symlink | ✔ | ✔ |
| `lstat` parent dir — refuse if symlink | ✔ | — |
| `O_NOFOLLOW` on open (where supported) | ✔ | ✔ |
| Atomic temp + rename | ✔ | — |
| `0600` mode on creation | ✔ | — |
| Size cap (`MAX_FLAG_BYTES = 64`) | — | ✔ |
| Whitelist validation (`VALID_MODES`) | — | ✔ |
| Silent-fail on any anomaly | ✔ | ✔ (returns `null`) |

`MAX_FLAG_BYTES = 64` is sized deliberately: the longest legitimate value is `"wenyan-ultra"` (12 bytes). 64 leaves slack without enabling a useful exfiltration primitive.

Silent-fail is the right default because the flag is best-effort. If it fails, the model keeps whatever register was last in context — verbose by default. Never crashes the session.

### Why the activation is invisible

Claude Code has a specific contract with `SessionStart` and `UserPromptSubmit` hooks:

- `stdout` from `SessionStart` → injected as `additionalContext` in system messages, invisible to user.
- JSON `{ hookSpecificOutput: { hookEventName, additionalContext } }` from `UserPromptSubmit` → injected the same way on the active turn.
- Anything emitted to `stderr` → shown to the user (and treated as a failure).

Caveman uses `stdout` only. The user sees no “loading caveman mode…” noise, no ruleset dump, no trace in the transcript. The model has the rules; the user has clean output.

This is the opposite of how most rule systems work (including most of Rulebook’s current surface): load into a visible `CLAUDE.md`, hope the user doesn’t accidentally edit it, hope it survives compaction. Hidden injection avoids all three failure modes.

### The three hooks, in settings.json form

This is the exact shape Caveman’s installer patches into `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [{
          "type": "command",
          "command": "node \"/home/user/.claude/hooks/caveman-activate.js\"",
          "timeout": 5,
          "statusMessage": "Loading caveman mode..."
        }]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [{
          "type": "command",
          "command": "node \"/home/user/.claude/hooks/caveman-mode-tracker.js\"",
          "timeout": 5,
          "statusMessage": "Tracking caveman mode..."
        }]
      }
    ]
  },
  "statusLine": {
    "type": "command",
    "command": "bash \"/home/user/.claude/hooks/caveman-statusline.sh\""
  }
}
```

Three entries, 5-second timeouts, no matchers. The installer is careful to **not** overwrite existing SessionStart/UserPromptSubmit entries from other plugins — it checks for a command substring match and appends if absent.

## Part B — What Rulebook has today (and what it doesn’t)

### Existing hook inventory

Rulebook ships six hooks, all of them Bash:

| Hook | Event | Purpose |
|---|---|---|
| `on-compact-reinject.sh` | SessionStart (matcher: `compact`) | Re-injects `.rulebook/COMPACT_CONTEXT.md` after a conversation compaction, as `additionalContext` JSON |
| `resume-from-handoff.sh` | SessionStart | Injects `.rulebook/handoff/_pending.md` when present |
| `check-context-and-handoff.sh` | Stop | Estimates context usage from transcript; warns/forces handoff at thresholds |
| `enforce-no-deferred.sh` | PreToolUse | Blocks `deferred`/`TODO`/`skip` writes in `tasks.md` |
| `enforce-no-shortcuts.sh` | PreToolUse | Blocks stubs/placeholders/`TODO`/`HACK` in source files |
| `enforce-mcp-for-tasks.sh` | PreToolUse | Blocks manual `mkdir`/`Write` in `.rulebook/tasks/` |

**Rulebook already emits `additionalContext` from a SessionStart hook** — `on-compact-reinject.sh` does exactly the same thing as `caveman-activate.js` step 3. The machinery is proven. What’s missing is a hook that does it for output-style rules, not just post-compact recovery.

### Existing settings-management module

`src/core/claude-settings-manager.ts` already:

- Idempotently merges rulebook-owned hook entries into `.claude/settings.json`.
- Tracks a fixed set of `SIGNATURES` (command substrings) to identify rulebook-managed entries.
- Has a clean `ClaudeSettingsDesire` interface that toggles each hook family (teamEnforcement, compactContextReinject, sessionHandoff, qualityEnforcement).
- Copies hook scripts from `templates/hooks/` into `.claude/hooks/` during `init`/`update`.

This is the right foundation. Adding terse-mode hooks means extending the signatures table and the desire interface, not rewriting anything.

### What Rulebook lacks specifically

| Component | Status |
|---|---|
| SessionStart hook emitting style rules | Missing (on-compact-reinject emits context, not style) |
| UserPromptSubmit hook tracking mode | Missing |
| UserPromptSubmit hook emitting per-turn attention anchor | Missing |
| Flag file for mode state | Missing |
| `safeWriteFlag` / `readFlag` primitives | Missing |
| Slash-command + natural-language mode switching | Missing |
| Statusline integration | Missing |
| MAX_FLAG_BYTES + VALID_MODES whitelist for flag reads | Missing |

## Part C — Implementation design for Rulebook

Everything below is specific to Rulebook v5.4.0. File paths are relative to the Rulebook repo. Names use `rulebook-terse` to match the broader v5.4.0 proposal.

### C.1 — Two new hook scripts

**`src/hooks/terse-activate.ts`** (compiles to `dist/hooks/terse-activate.js` and copied to `.claude/hooks/` on init/update).

Responsibilities:

1. Read active mode from `getDefaultMode()` (env `RULEBOOK_TERSE_MODE` → `$XDG_CONFIG_HOME/rulebook/config.json` → `~/.rulebook/config.json` → `'brief'`).
2. If mode is `off`, `unlink` the flag file, exit silently.
3. Otherwise `safeWriteFlag($RULEBOOK_CONFIG_DIR/.rulebook-terse-mode, mode)`.
4. Read `templates/skills/rulebook-terse/SKILL.md` (falls back to hardcoded minimal rules if absent — matches Caveman’s standalone-install fallback).
5. Strip YAML frontmatter.
6. Filter the intensity table to the active level only, mirroring Caveman’s regex filter.
7. Write to stdout — Claude Code injects as hidden `additionalContext`.

**`src/hooks/terse-mode-tracker.ts`** (same compile/copy flow).

Responsibilities:

1. Read JSON from stdin.
2. Parse for slash commands:
   - `/rulebook-terse` → default mode
   - `/rulebook-terse brief|terse|ultra|off`
   - `/rulebook-terse-commit` / `/rulebook-terse-review` → independent sub-modes
3. Parse for natural-language activation: `"terse mode"`, `"be terse"`, `"less tokens"`, `"activate rulebook-terse"`.
4. Parse for deactivation: `"stop terse"`, `"normal mode"`, `"disable terse"`.
5. Update or delete flag via `safeWriteFlag` / `unlink`.
6. Read current mode via `readFlag` (size-capped, symlink-safe, whitelist-validated).
7. If active and persistent, emit the attention-anchor JSON:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "RULEBOOK-TERSE ACTIVE (brief). No preamble, no restating the question, no filler. Code/tests/commits/security: write full. Quality-gate failures + destructive ops: write full."
  }
}
```

The reinforcement string is ~45 tokens. Matches Caveman’s token budget.

### C.2 — Shared safe-IO module

**`src/hooks/safe-flag-io.ts`** — the TS port of `safeWriteFlag` + `readFlag`.

```typescript
const VALID_MODES = [
  'off', 'brief', 'terse', 'ultra',
  'commit', 'review'
] as const;
export type TerseMode = typeof VALID_MODES[number];

const MAX_FLAG_BYTES = 32; // longest valid is 'review' (6 bytes)

export function safeWriteFlag(flagPath: string, content: string): void { /* ... */ }
export function readFlag(flagPath: string): TerseMode | null { /* ... */ }
```

Same invariants as Caveman (lstat, O_NOFOLLOW, atomic temp+rename, 0600, size cap, whitelist, silent-fail). Unit-test each invariant — symlink refusal, size cap, whitelist rejection, concurrent write race.

This module should be used by **any** Rulebook hook that touches a predictable user-owned path. Retrofit existing hooks where applicable (e.g., `check-context-and-handoff.sh` currently writes `.rulebook/handoff/_pending.md` via `echo >` — vulnerable to the same symlink-clobber class of bug).

### C.3 — TypeScript vs Bash: stay TS

Rulebook’s existing hooks are Bash. That was the right default when hooks did simple string checks. But:

- The TS/JS version gets shared `safe-flag-io` for free (type-checked, unit-testable).
- Windows compatibility is dramatically better — no shelling to `jq` (which Windows users must install separately).
- The Caveman model of “`node "$PATH"`” already works on every Claude Code install (Claude Code requires Node to run).
- `claude-settings-manager.ts` already generates both `.sh` and `.ps1` variants for Bash hooks — adding TS hooks lets us ship one file instead of two.

**Recommendation**: ship the two new terse hooks as TS, compile with existing `tsc` to `dist/hooks/`, copy into `.claude/hooks/` during init/update. Keep existing Bash hooks as-is (no breaking change).

Use `{"type": "commonjs"}` in `dist/hooks/package.json` if anything ships with `require()` — matches Caveman’s collision-avoidance pattern for users with ESM in `~/.claude/package.json`.

### C.4 — Wiring into `claude-settings-manager.ts`

Three changes:

**1. Extend `ClaudeSettingsDesire`:**

```typescript
export interface ClaudeSettingsDesire {
  teamEnforcement?: boolean;
  compactContextReinject?: boolean;
  sessionHandoff?: boolean;
  qualityEnforcement?: boolean;
  terseMode?: boolean;       // NEW — wires terse-activate + terse-mode-tracker
  terseStatusline?: boolean; // NEW — wires the [RULEBOOK:TERSE] statusline badge
}
```

**2. Extend the `SIGNATURES` table:**

```typescript
const SIGNATURES = {
  // ... existing ...
  terseActivate: 'terse-activate',
  terseModeTracker: 'terse-mode-tracker',
  terseStatusline: 'terse-statusline',
} as const;
```

**3. Extend `applyClaudeSettings()` with two new `upsertHook` calls** — one SessionStart (no matcher), one UserPromptSubmit (no matcher). Exactly mirrors the existing `compactContextReinject` and `qualityEnforcement` branches.

Because `claude-settings-manager.ts` already uses signature-based identification and never touches entries it doesn’t own, existing rulebook-managed hooks (handoff, enforce-*) and user-authored hooks both keep working.

### C.5 — Config file location and env resolution

Caveman resolution order:
1. `CAVEMAN_DEFAULT_MODE` env
2. `$XDG_CONFIG_HOME/caveman/config.json` → `~/.config/caveman/config.json` → `%APPDATA%\caveman\config.json`
3. `'full'`

Rulebook equivalent:
1. `RULEBOOK_TERSE_MODE` env
2. `.rulebook/rulebook.json` field `terse.defaultMode` (project-local — preferred)
3. `$XDG_CONFIG_HOME/rulebook/config.json` → `~/.config/rulebook/config.json` → `%APPDATA%\rulebook\config.json` (user-global fallback)
4. `'brief'`

Difference from Caveman: **project-local config takes priority over user-global**. Because Rulebook is project-aware (it already uses `.rulebook/rulebook.json`) and project preferences should dominate. A user working on a project whose team standard is `brief` shouldn’t accidentally get `ultra` because their personal global config says so.

### C.6 — Flag file location

Store at `.rulebook/.terse-mode` inside the project, not in `$CLAUDE_CONFIG_DIR`. Rulebook is project-scoped. Two projects open in parallel should have independent modes.

Already gitignored pattern: `.rulebook/` is tracked but `.rulebook/backup/`, `.rulebook/handoff/`, `.rulebook/telemetry/` are ignored. Add `.rulebook/.terse-mode` to the ignore list during `rulebook init`.

### C.7 — Tier-aware default intensity (Rulebook-unique feature)

Rulebook’s agent delegation assigns tiers (haiku / sonnet / opus). The SessionStart hook can read the currently-active agent tier from a Rulebook-maintained context file (or environment variable set by the agent dispatcher) and pick an intensity-appropriate default:

| Agent tier | Default intensity |
|---|---|
| `research` / haiku | `terse` |
| `standard` / sonnet | `brief` |
| `core` / opus | `off` (full prose for complex reasoning) |

User can still override with `/rulebook-terse <level>`. The mode persists until change or session end — identical to Caveman’s semantics.

### C.8 — What the user sees

| Surface | What shows |
|---|---|
| Session start | Nothing. Hook injects rules invisibly. |
| Statusline (opt-in) | `[TERSE:brief]` badge, updates on mode change |
| Slash command | `/rulebook-terse`, `/rulebook-terse brief`, `/rulebook-terse off` |
| Natural language | “be terse”, “less tokens”, “normal mode”, “stop terse” |
| Hook timeouts | 5 seconds each — matches Caveman. If a hook exceeds this, Claude Code logs and skips. |
| Errors | Silent. Failed hook never blocks session start. |

### C.9 — Token budget for the injection itself

Approximate cost to the model, per session:

| Event | Tokens | Frequency |
|---|---|---|
| SessionStart rule injection (filtered SKILL.md) | ~350 | once per session |
| UserPromptSubmit attention anchor | ~45 | every user message |

For a 30-message session: `350 + 30 × 45 = 1700 tokens` of hook overhead. For every message, the model saves an estimated 200–800 output tokens depending on task. Break-even is reached after the first 2–3 meaningful responses; everything after is net savings.

### C.10 — What this stack does NOT do

Intentional non-features:

1. **Does not touch commit messages.** `rulebook-terse-commit` is a separate sub-skill with its own activation. The base hook does nothing to commits.
2. **Does not modify code generation.** Auto-clarity drops the terse register for code blocks.
3. **Does not persist across projects.** Flag is project-local.
4. **Does not send any data anywhere.** No telemetry on mode changes — Rulebook’s existing telemetry is opt-in and privacy-first, this respects that.
5. **Does not crash.** Every filesystem operation silent-fails.

## Part D — Migration path from existing hooks

No existing Rulebook hook collides with these two new hooks:

- `on-compact-reinject.sh` uses SessionStart with `matcher: "compact"` — only runs on compact events. New terse hook uses SessionStart with no matcher — runs on every session start. Both can coexist.
- `resume-from-handoff.sh` uses SessionStart no-matcher (same slot as new terse hook). Two entries in the `hooks.SessionStart` array is fine — Claude Code runs them in order.
- `check-context-and-handoff.sh` is Stop, unrelated.
- `enforce-*` are PreToolUse, unrelated.

Ordering inside `hooks.SessionStart`: put `terse-activate` **before** `resume-from-handoff`. Reason: if a handoff restore is happening, the terse rules should already be in context so the restored work gets the compressed register from the first message.

## Part E — Concrete implementation checklist

Files to create (relative to Rulebook repo root):

```
src/hooks/terse-activate.ts                    # SessionStart — TS
src/hooks/terse-mode-tracker.ts                # UserPromptSubmit — TS
src/hooks/safe-flag-io.ts                      # shared — TS, unit-tested
src/hooks/terse-config.ts                      # mode resolution — TS
templates/skills/rulebook-terse/SKILL.md       # source of truth (rules + intensity table)
templates/skills/rulebook-terse-commit/SKILL.md
templates/skills/rulebook-terse-review/SKILL.md
templates/hooks/terse-statusline.sh            # optional [TERSE:mode] badge
templates/hooks/terse-statusline.ps1           # Windows counterpart
tests/unit/safe-flag-io.test.ts                # symlink refusal, size cap, whitelist, race
tests/unit/terse-activate.test.ts              # SKILL.md filtering, frontmatter strip, fallback
tests/unit/terse-mode-tracker.test.ts          # slash-command parsing, NL activation, deactivation
```

Files to modify:

```
src/core/claude-settings-manager.ts            # add terseMode/terseStatusline to desire, SIGNATURES, applyClaudeSettings
src/core/config-manager.ts                     # add terse.defaultMode to schema
src/core/doctor.ts                             # add health checks: flag-file writable, SKILL.md fresh
src/cli/commands/                              # add `rulebook terse set|get|reset` subcommand
src/mcp/rulebook-server.ts                     # add rulebook_terse_set, rulebook_terse_status, rulebook_terse_reset tools
.rulebook/specs/TOKEN_OPTIMIZATION.md          # replace tier prose with pointer to rulebook-terse skill
```

Files to delete: none. v5.4.0 is additive.

## Summary — one paragraph

Caveman’s entire output-reduction mechanism is two small Node hooks coordinated through a size-capped, symlink-safe flag file. SessionStart injects a filtered intensity-specific ruleset invisibly via stdout; UserPromptSubmit keeps the register in the model’s attention every turn with a ~40-token reinforcement string. Rulebook already has every prerequisite — a settings manager that idempotently merges hook entries, a SessionStart hook that already emits `additionalContext` (`on-compact-reinject`), a templates system for per-project distribution — so adopting the pattern is additive, not transformational. The single new safety primitive worth taking seriously is `safeWriteFlag` + `readFlag`: Rulebook’s hooks today are vulnerable to the same symlink-clobber and symlink-exfil attacks that Caveman deliberately engineered against. The two new hooks plus the shared safe-IO module plus four test files is the entire delta.
