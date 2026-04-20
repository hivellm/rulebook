# 01 — Architecture

## Repository layout

```
caveman/
├── skills/                     # SOURCE OF TRUTH — edit these
│   ├── caveman/SKILL.md        # main skill (intensity levels, rules, wenyan)
│   ├── caveman-commit/SKILL.md
│   ├── caveman-review/SKILL.md
│   ├── caveman-help/SKILL.md
│   └── compress/SKILL.md
├── rules/
│   └── caveman-activate.md     # SOURCE — always-on auto-activation body
├── caveman-compress/           # Python CLI sub-project (compresses memory files)
├── hooks/                      # Claude Code hooks (JS + shell + PowerShell)
├── benchmarks/                 # Real Claude API token counts (reproducible)
├── evals/                      # Three-arm offline eval harness
├── plugins/caveman/            # AUTO-SYNCED Codex plugin bundle
├── commands/                   # Slash commands per agent
├── docs/                       # Reference material
├── tests/
│
├── caveman/SKILL.md            # AUTO-SYNCED from skills/caveman/SKILL.md
├── caveman.skill               # AUTO-SYNCED ZIP of skills/caveman/
├── .cursor/, .windsurf/, .clinerules/, .codex/, .agents/   # agent drop points
├── .github/copilot-instructions.md      # AUTO-SYNCED from rules/
│
├── AGENTS.md, GEMINI.md        # tiny stubs pointing at the skill
├── CLAUDE.md                   # caveman-compressed project guide for agents
├── CLAUDE.original.md          # human-readable original (backup)
├── gemini-extension.json       # Gemini CLI extension manifest
└── README.md                   # product front door
```

The top-level distinction is critical and enforced by `CLAUDE.md`: **only files under `skills/` and `rules/` are edited by humans**. Everything under `.cursor/`, `.windsurf/`, `.clinerules/`, `plugins/`, `caveman/` (root), and the `caveman.skill` zip is overwritten by CI on every push to `main`.

## Single source of truth + CI fan-out

`.github/workflows/sync-skill.yml` triggers when the two source files change. It does four things:

1. **Copies** `skills/caveman/SKILL.md` to every agent-specific SKILL.md location (Codex plugin bundle, `.cursor/skills/`, `.windsurf/skills/`, root `caveman/`).
2. **Rebuilds** `caveman.skill` by zipping the `skills/caveman/` directory.
3. **Regenerates** each agent rule file from `rules/caveman-activate.md`, prepending agent-specific frontmatter:
   - Cursor: `alwaysApply: true`
   - Windsurf: `trigger: always_on`
   - Cline / Copilot: no frontmatter, just the body
4. **Commits** the synced files with `[skip ci]` to prevent infinite loops, signed as `github-actions[bot]`.

The pattern is: **one Markdown file in `skills/`, one Markdown file in `rules/`, N agent-specific files downstream, zero manual copy-paste**.

### Why this matters

Without this workflow, keeping 9+ agent-specific files in sync is a maintenance disaster — every bug fix or copy change needs to be re-applied 9 times, and drift is inevitable. Caveman demonstrates the pattern is tractable *if* the sync is CI-enforced and the synced locations are clearly marked as do-not-edit.

## Claude Code hook system

Three hooks in `hooks/`, coordinated via a single flag file.

```
SessionStart hook        UserPromptSubmit hook
  caveman-activate.js     caveman-mode-tracker.js
           \                    /
            \                  /
             v                v
     $CLAUDE_CONFIG_DIR/.caveman-active    ← single source of mode state
                     |
                     v
             caveman-statusline.sh
        [CAVEMAN]  [CAVEMAN:ULTRA]  [CAVEMAN:WENYAN]
```

### `SessionStart` — `caveman-activate.js`

Runs once per session. Responsibilities:

1. **Write the active mode** to the flag file (`safeWriteFlag(flagPath, 'full')` by default).
2. **Emit the caveman ruleset on stdout.** Claude Code treats SessionStart hook stdout as **system context injected invisibly** — the model sees the rules, the user never sees the noise.
3. **Check `settings.json` for an existing `statusLine`.** If absent, the hook nudges Claude to offer setup on first interaction — it does *not* overwrite a user’s custom statusline.

Silent-fails on every filesystem error. A broken hook never blocks session start.

### `UserPromptSubmit` — `caveman-mode-tracker.js`

Reads JSON from stdin on every user prompt. Three jobs:

1. **Slash-command activation.** `/caveman`, `/caveman lite`, `/caveman ultra`, `/caveman wenyan`, `/caveman-commit`, `/caveman-review`, `/caveman-compress` — each maps to a mode string written to the flag file.
2. **Natural-language activation/deactivation.** Matches `activate caveman`, `talk like caveman`, `turn on caveman mode`, etc. for activation; `stop caveman`, `normal mode`, `deactivate caveman` for deactivation. README promises these triggers — the hook enforces them.
3. **Per-turn reinforcement.** When the flag is set to a persistent mode (not `commit`/`review`/`compress`, which are one-shot), emits a small `hookSpecificOutput` JSON reminder. This prevents style drift when other plugins inject competing instructions mid-conversation.

### Statusline — `caveman-statusline.sh` / `.ps1`

Reads the flag file and prints a colored badge. Shell version for macOS/Linux, PowerShell version for Windows. Configured via `settings.json > statusLine.command`.

### Shared module — `caveman-config.js`

Two exports used by both write hooks:

- **`getDefaultMode()`** — resolves default intensity from (in order): `CAVEMAN_DEFAULT_MODE` env var → `$XDG_CONFIG_HOME/caveman/config.json` → `~/.config/caveman/config.json` → `%APPDATA%\caveman\config.json` → `'full'`.
- **`safeWriteFlag(flagPath, content)`** — symlink-safe flag write (see security section below).

### The `hooks/package.json` marker

Tiny file: `{"type": "commonjs"}`. Its purpose is to pin the directory so the `.js` hooks resolve as CommonJS **even when an ancestor `package.json` (typically `~/.claude/package.json` from another plugin) declares `"type": "module"`**. Without it, `require()` throws `ReferenceError: require is not defined in ES module scope` and every hook crashes.

This is a real-world collision any plugin writer in the Claude Code ecosystem will hit eventually.

### Hook installation

- **Plugin install** — hooks wired automatically by Claude Code’s plugin system.
- **Standalone install** — `hooks/install.sh` (macOS/Linux) or `hooks/install.ps1` (Windows) copies hook files into `~/.claude/hooks/` and patches `~/.claude/settings.json` to register the two hooks plus the statusline.
- **Uninstall scripts** reverse both operations.

All installer and statusline scripts honor `CLAUDE_CONFIG_DIR` — nothing is hardcoded to `~/.claude`.

## Security: the `safeWriteFlag` protection

The flag file lives at a **predictable user-writable path** (`$CLAUDE_CONFIG_DIR/.caveman-active`). Without precautions, a local attacker with write access to that directory could replace the flag with a symlink to, say, `~/.ssh/authorized_keys`. The next hook write would clobber that file with the string `"full"`.

`safeWriteFlag` mitigates this with four measures:

1. **Refuse if target or its immediate parent is already a symlink.** `lstat()` check before any write.
2. **Open with `O_NOFOLLOW`** where supported. On symlink races, the open fails rather than following.
3. **Atomic temp-and-rename.** Writes to `<flag>.tmp-<pid>`, then `rename()` onto the final path.
4. **`0600` mode on creation.** Only the owner can read or write.

Silent-fail on all filesystem errors, per the broader hook safety policy.

This is the kind of hardening Rulebook’s own hook implementations do not yet perform — something as simple as a `PreToolUse` hook writing to `~/.rulebook/.state` is vulnerable to the same attack.

## Cross-agent distribution

How each agent picks up caveman:

| Agent | Mechanism | Auto-activates? |
|---|---|---|
| Claude Code | Plugin (hooks + skills) or standalone hooks | Yes — SessionStart hook injects rules invisibly |
| Codex | `plugins/caveman/` + repo-local `.codex/hooks.json` + `.codex/config.toml` | Yes on macOS/Linux — SessionStart hook (Codex hooks currently disabled on Windows) |
| Gemini CLI | Extension manifest + `GEMINI.md` context file | Yes — context file loads every session |
| Cursor | `.cursor/rules/caveman.mdc` with `alwaysApply: true` | Yes — always-on rule |
| Windsurf | `.windsurf/rules/caveman.md` with `trigger: always_on` | Yes — always-on rule |
| Cline | `.clinerules/caveman.md` (auto-discovered) | Yes |
| Copilot | `.github/copilot-instructions.md` + `AGENTS.md` | Yes — repo-wide instructions |
| Others (40+) | `npx skills add JuliusBrussee/caveman` | **No** — user must say `/caveman` each session |

The “others” row is an important honest admission: `npx skills` installs only the skill file, not the agent’s rule/instruction file, so there is no auto-activation. The README’s “Want it always on?” snippet is the user’s workaround.

## Design choices worth stealing

1. **Source-of-truth markers in `CLAUDE.md`.** Caveman’s own `CLAUDE.md` has an explicit table of “edit-only” files and a second table of “do-not-edit, auto-synced” files. Anyone — human or agent — can see within 10 seconds where to make a change.
2. **Hidden stdout as system context.** The SessionStart hook’s stdout is never shown to the user but is injected into the model’s context. This is the cleanest way to load rules that the model must follow but the user shouldn’t have to see every session.
3. **Per-turn reinforcement for persistent modes.** A small attention anchor prevents style drift mid-conversation, without re-injecting the whole ruleset (which would waste context).
4. **`[skip ci]` on auto-sync commits.** Without this, the sync workflow loops on its own commits.
