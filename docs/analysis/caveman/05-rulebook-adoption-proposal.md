# 05 — Rulebook Adoption Proposal (v5.4.0 “Caveman-inspired”)

This report answers the question: **how do we benefit from the Caveman concept in Rulebook, and what does implementation look like for a new version?**

Reports 01–04 described *what Caveman is*. This report is the concrete proposal: what Rulebook adopts, what it deliberately skips, and the phased implementation plan to ship it as **v5.4.0**.

## TL;DR

Rulebook already solved half of the Caveman problem: **input-side context compression** (AGENTS.md 6641→224 lines, total auto-loaded context 250KB→1.4KB, thin `CLAUDE.md` with `@imports`). It has not solved the other half: **output-side verbosity**. Today `TOKEN_OPTIMIZATION.md` is advisory prose that the model reads and may or may not follow. Caveman’s contribution is a **structurally-enforced** output compression skill with intensity levels, auto-clarity escape hatches, and an evaluation harness that proves it works.

v5.4.0 adopts five of Caveman’s patterns, skips two, and layers on three integrations specific to Rulebook’s existing systems (tier-based delegation, skill enable/disable, MCP).

## What Rulebook already has vs what Caveman adds

| Area | Rulebook v5.3.3 | Caveman | Gap to close |
|---|---|---|---|
| **Input context compression** | AGENTS.md 95% trimmed, thin CLAUDE.md w/ `@imports`, `COMPACT_CONTEXT.md` on compact | Per-file compression via `caveman-compress` CLI | Add `rulebook compress` for override/custom memory files |
| **Output verbosity rules** | `TOKEN_OPTIMIZATION.md` advisory (tier-based brief/terse/full) | Enforced skill w/ intensity levels, examples, auto-clarity | Add `rulebook-terse` skill backed by hook reinforcement |
| **Multi-agent distribution** | `templates/` populated during `init`/`update`, no push-time fan-out | CI fan-out to 9+ locations on push | Add `.github/workflows/sync-rules.yml` |
| **Session injection** | Visible via AGENTS.md import chain | Invisible via SessionStart hook stdout | Move select rules to hidden injection |
| **Hook safety** | Silent-fail partially implemented | `safeWriteFlag()` + `O_NOFOLLOW` + atomic rename + `0600` | Harden existing hooks |
| **Evaluation** | `rulebook doctor` checks structure, no token measurement | Three-arm harness (baseline/terse/skill) + tiktoken offline | Add `evals/` directory |
| **ESM/CJS collision** | `.claude/hooks/*.sh` only — no JS exposure | `hooks/package.json` pins CJS | No action needed until Rulebook ships JS hooks |
| **Flag-file mode state** | Not present | `.caveman-active` + statusline badge | Add `.rulebook-mode` flag |

## What v5.4.0 ships

Five adopted patterns, grouped into three deliverables.

### Deliverable 1 — `rulebook-terse` skill + sub-skills

A new skill family that compresses agent output. Designed to compose cleanly with Rulebook’s existing **tier-based delegation** (Research / Standard / Core) — the skill supplies stylistic enforcement the tier system currently only recommends.

**File tree**

```
templates/skills/rulebook-terse/SKILL.md            # source of truth (main skill)
templates/skills/rulebook-terse-commit/SKILL.md     # commit-message sub-skill
templates/skills/rulebook-terse-review/SKILL.md     # PR-review sub-skill
templates/skills/rulebook-compress/SKILL.md         # memory-file compression
templates/rules/terse-activate.md                   # always-on activation body
src/skills/compress/cli.ts                          # rulebook compress <file> CLI
src/hooks/terse-mode-tracker.ts                     # UserPromptSubmit (TS, compiled to dist/)
src/hooks/terse-activate.ts                         # SessionStart (TS, compiled to dist/)
src/hooks/safe-write-flag.ts                        # shared module
```

**Intensity levels — aligned with existing tiers**

| Level | Aligned with | When active |
|---|---|---|
| `off` | Core tier (default for complex bugs, architecture) | Explicitly disabled or Core-tier task |
| `brief` | Standard tier (implementation, tests) | Default for implementers |
| `terse` | Research tier (read-only exploration) | Default for researchers |
| `ultra` | CI / automation output | Non-interactive calls |

Four levels, not six. No wenyan — Rulebook is English-primary and the cross-cultural tooling risk isn’t worth the marginal compression.

**Auto-clarity rules (non-negotiable escape hatch)**

Full prose is restored for:

1. Security warnings and CVE-class findings.
2. Destructive operations (`rm`, `git reset --hard`, `DROP TABLE`, `rulebook_task_delete`).
3. Quality-gate failures (type-check, lint, tests, coverage < 95%).
4. User repeats a question or says they didn’t understand.
5. Task-tail enforcement messages (docs/tests/verify — these must be unambiguous).

Rulebook’s `enforce-*` hooks already fire under several of these conditions. The skill reads those hook outputs and the auto-clarity rule triggers automatically.

**Boundaries (unchanged from Caveman)**

- Code blocks: byte-for-byte pass-through.
- Commit messages: `rulebook-terse-commit` takes over, follows Rulebook’s conventional-commits spec.
- PR reviews: `rulebook-terse-review` format `L<line>: <severity> <problem>. <fix>.`
- Test assertions, error messages, spec files: unchanged.

### Deliverable 2 — `rulebook compress` CLI + companion skill

Analog of `caveman-compress`. Compresses prose portions of Markdown memory files while preserving code, URLs, paths, commands, headings, dates, version numbers.

**CLI surface**

```bash
rulebook compress <file>           # rewrite in place, backup to <file>.original.md
rulebook compress --dry-run <file> # print diff, no write
rulebook compress --restore <file> # restore from <file>.original.md
rulebook compress --check <file>   # report compression ratio
```

**MCP tool surface**

- `rulebook_compress` — compress a single file; returns before/after stats.
- `rulebook_compress_list` — report compression state across `CLAUDE.md`, `AGENTS.override.md`, `.rulebook/PLANS.md`, any file under `.rulebook/knowledge/` or `.rulebook/learnings/`.

**Safety validations (fail the compression, do not write)**

- Every heading present in input must be present in output.
- Every code fence byte-identical.
- Every URL byte-identical.
- Every file path (regex: `[A-Za-z]:\\` or `\./` or `/[a-z]+`) byte-identical.
- Every date (`YYYY-MM-DD`) byte-identical.
- Every version number (`v?\d+\.\d+(\.\d+)?`) byte-identical.
- Up to **2 retries** with targeted patches on validation failure; then fail hard.

**Dogfooding target**

Once the CLI ships, Rulebook’s own `templates/core/CLAUDE.md`, `templates/core/AGENTS_LEAN.md`, and `templates/rules/*.md` become the first files compressed. Every session in every Rulebook-initialized project then pays less context cost.

### Deliverable 3 — Three-arm evaluation harness + `rulebook evals` MCP

**File tree**

```
evals/
├── README.md
├── prompts/
│   ├── en.txt                     # one prompt per line, English
│   └── pt-br.txt                  # Portuguese prompts for multilingual eval
├── arms.json                      # arm definitions (baseline/terse/skill)
├── llm_run.ts                     # collects snapshots — needs API access
├── measure.ts                     # offline token counts via tiktoken
├── report.ts                      # generates Markdown report
└── snapshots/
    └── results.json               # committed to git
```

**Three arms**

| Arm | System prompt |
|---|---|
| `baseline` | (none) |
| `terse` | `Answer concisely. No preamble, no restating the question.` |
| `rulebook-terse` | `Answer concisely.` + content of `rulebook-terse` SKILL.md |

Honest delta reported in every benchmark: **`rulebook-terse` vs `terse`**, not vs `baseline`. Any skill whose lift over `terse` is < 15% on average is flagged by the harness for review.

**Integration with existing tooling**

- `rulebook doctor` gains an `evals` check: “Are snapshots stale (> 30 days)? Is any skill’s lift over `terse` below the review threshold?”
- `rulebook_evals_run` MCP tool triggers the expensive step (LLM calls) on demand.
- `rulebook_evals_measure` MCP tool runs the cheap step (tiktoken) without API credentials.
- GitHub Actions gate: on every PR touching a `SKILL.md`, CI re-runs `measure` (offline, free) and comments the delta table on the PR.

**Why this matters specifically for Rulebook.** Rulebook has shipped 8+ rule files, 18+ skills, and a growing spec library with zero quantitative evidence that any specific rule is doing work. The three-arm harness gives each rule its own number.

## Patterns explicitly skipped

### Skip 1 — Meme branding

Caveman’s virality relied on the caveman-speak meme. Rulebook is a professional framework used in production contexts. `rulebook-terse` stays technically-named. No ecosystem names, no mascot, no `why use many token when few do trick` copy.

### Skip 2 — Classical Chinese intensity tier

Wenyan mode is genuinely innovative but introduces cross-cultural code-switching risk (mixed English-Chinese output confusing users, tokenizer approximation errors in tiktoken), and Rulebook users overwhelmingly work in English or Portuguese. Not enough lift to justify the surface area.

### Skip 3 — Statusline badge as primary UX

Caveman’s orange `[CAVEMAN]` statusline badge is a major part of its personality. Rulebook could reuse the flag-file pattern, but the badge carries the same branding weight. Keep the flag file; make the badge opt-in via config, default off.

## Additions unique to Rulebook (not in Caveman)

### Addition 1 — Tier-aware default intensity

Caveman’s mode is set by user command. Rulebook already assigns agents to tiers (`researcher` → haiku, `implementer` → sonnet, `architect` → opus). The skill should read the tier assignment from the active agent context and default the intensity accordingly:

- `researcher` → `terse`
- `implementer` → `brief`
- `architect` → `off`
- `team-lead` → `brief`

Users can still override per turn with `/rulebook terse|brief|off`.

### Addition 2 — MCP-native mode switching

All mode switches exposed as MCP tools: `rulebook_terse_set`, `rulebook_terse_status`, `rulebook_terse_reset`. Lets automations (Ralph loops, agent teams) set intensity programmatically without parsing slash commands.

### Addition 3 — Integration with existing `enforce-*` hooks

Rulebook ships five structural-enforcement hooks. When any of them fires a block/warning, the `rulebook-terse` skill auto-drops to full prose for that turn (via the auto-clarity rule). Users always see enforcement messages at full fidelity.

## Implementation phases

### Phase 0 — Prep (1 task)

- [ ] Rulebook task: `rulebook-terse-foundations`. Create `.rulebook/tasks/rulebook-terse-foundations/` with `proposal.md`, `tasks.md`, and `specs/rulebook-terse/spec.md`.
- [ ] Reference this report: `Source: docs/analysis/caveman/`.
- [ ] Scope: create the skill SKILL.md files as static content. No hooks yet. No CLI yet.

**Exit criteria**: SKILL.md files render correctly when loaded manually; three-arm eval harness smoke-tested offline with a trivial prompt set.

### Phase 1 — Skill family (3 tasks)

- [ ] `rulebook-terse-skill`: `templates/skills/rulebook-terse/SKILL.md` with four intensity levels, auto-clarity, boundaries. No hooks yet.
- [ ] `rulebook-terse-sub-skills`: commit + review sub-skills, each independent.
- [ ] `rulebook-terse-templates-wiring`: ensure `rulebook init`/`update` copies the skill files into new projects.

**Exit criteria**: `rulebook skill list` shows the new skills. Manual activation via `/rulebook terse` works. No hooks, no flag file yet.

### Phase 2 — Hooks + flag file (2 tasks)

- [ ] `rulebook-terse-hooks`: TS implementation of `terse-activate` (SessionStart) + `terse-mode-tracker` (UserPromptSubmit). Hooks compile to `dist/hooks/`. Flag file at `$RULEBOOK_CONFIG_DIR/.rulebook-mode` (fallback `~/.rulebook/.rulebook-mode`).
- [ ] `rulebook-safe-write`: extract `src/hooks/safe-write-flag.ts` (port of `safeWriteFlag`). Retrofit existing hooks to use it. Audit: every write to a predictable user path goes through this module.

**Exit criteria**: `rulebook init` wires hooks in `.claude/settings.json`. Mode persists across turns. Symlink-race integration test passes.

### Phase 3 — Compression CLI (2 tasks)

- [ ] `rulebook-compress-cli`: `src/skills/compress/cli.ts` + `src/skills/compress/validator.ts` (heading/code-fence/URL invariants). CLI subcommands: `compress`, `--dry-run`, `--restore`, `--check`.
- [ ] `rulebook-compress-mcp`: expose `rulebook_compress` + `rulebook_compress_list` MCP tools. Add doctor check for stale `.original.md` backups.

**Exit criteria**: Running `rulebook compress templates/core/CLAUDE.md` produces a valid compressed file + `.original.md` backup. All validators pass round-trip.

### Phase 4 — Evaluation harness (2 tasks)

- [ ] `rulebook-evals-harness`: `evals/` directory with `llm_run.ts`, `measure.ts`, `report.ts`, `arms.json`, committed snapshot.
- [ ] `rulebook-evals-ci`: GitHub Actions workflow that runs `measure` on PRs touching `SKILL.md` files and posts a delta table as a PR comment.

**Exit criteria**: Every existing skill in `templates/skills/` gets an evaluation row. Each row reports `baseline`, `terse`, `skill` token counts, and the honest delta.

### Phase 5 — CI fan-out (1 task)

- [ ] `rulebook-rule-sync`: GitHub Actions workflow triggered on pushes to `main` touching `templates/rules/**` or `templates/skills/**`. Fans out to agent-specific locations and commits with `[skip ci]`. Mirror Caveman’s `sync-skill.yml` structure.

**Exit criteria**: `rulebook init` + `rulebook update` continue to work. Additionally, direct clones of the repo for Cursor/Windsurf/etc. pick up the pre-synced files without running `rulebook`.

### Phase 6 — Release (1 task)

- [ ] `rulebook-v5.4.0-release`: CHANGELOG entry, README update, migration note (“5.3.x → 5.4.0: run `rulebook update` to install `rulebook-terse` skill”), npm publish.

**Exit criteria**: `npm install @hivehub/rulebook@5.4.0` installs the new skill. Existing projects on 5.3.x can opt in with `rulebook update`. Existing projects on 5.2.x and earlier get a migration guide in the CHANGELOG.

## Risks and mitigation

| Risk | Mitigation |
|---|---|
| **Compressed output breaks code-review workflows that rely on prose explanation.** | Auto-clarity rule drops to full prose on PR reviews with CVE-class findings or architectural disagreements. Default for `architect` tier is `off`. |
| **Users on long-running agent teams get drift** (one team member in `terse`, another in `brief`). | Flag file is per-session, not per-agent. Mode is uniform across the team once set by team-lead. |
| **Windows users hit symlink/ESM/CJS issues.** | Ship `package.json` CJS marker; honor `RULEBOOK_CONFIG_DIR`; `safeWriteFlag` uses `O_NOFOLLOW` where available and `lstat` pre-check where not. |
| **tiktoken ≠ Claude tokenizer — absolute numbers wrong.** | Document as ratio-only analysis. Absolute headline comes from `benchmarks/` using the real Claude API (optional, opt-in). |
| **Skill drift over long sessions.** | Per-turn reinforcement via `UserPromptSubmit` hook (small attention anchor, not full ruleset re-injection). |
| **Existing `TOKEN_OPTIMIZATION.md` spec contradicts new skill.** | Replace spec content with a pointer to the skill. One-line: “See `templates/skills/rulebook-terse/SKILL.md` for enforced rules.” Keep tier-to-intensity mapping. |

## Acceptance criteria for v5.4.0 shipping

1. `rulebook init` in a new project installs `rulebook-terse` with the configured default intensity.
2. `rulebook doctor` reports pass for: skill installed, flag file writable, evals snapshot fresh.
3. Three-arm eval harness reports **lift ≥ 20%** for `rulebook-terse` over `terse` on the average of the prompt suite.
4. `rulebook compress templates/core/CLAUDE.md` round-trips through validators without error, and output is **≥ 30% smaller** than input.
5. Symlink-race test: concurrent `safeWriteFlag` calls never follow a symlink into `~/.ssh/`.
6. Windows CI passes end-to-end (install, init, mode switch, compress, evals measure).
7. CHANGELOG entry documents every new CLI subcommand, MCP tool, skill, and hook.

## Success metrics (first 90 days post-release)

- **Adoption**: `rulebook-terse` enabled by default in ≥ 80% of new `rulebook init` projects (users must actively opt out).
- **Output token savings**: median ≥ 40% reduction on `implementer`-tier tasks measured via the eval harness.
- **Incident rate**: zero reports of compressed security warnings or destructive-op confirmations causing user error.
- **Compression reach**: `rulebook compress` applied to `CLAUDE.md` in ≥ 50% of projects, measurable via opt-in telemetry.

## Quick-win ordering (if shipping must be scoped down)

If the full plan is too large for one release, this is the minimum viable v5.4.0:

1. **Phase 1** — skill family only. Ship the SKILL.md files. User opts in via `/rulebook terse`. (≈2 days of work.)
2. **Phase 2 partial** — just `safeWriteFlag` retrofit to existing hooks. No new flag file. (≈1 day.)
3. **Phase 4 partial** — offline-only `measure.ts` with a fixture snapshot. No API integration. (≈2 days.)

Ship this as **v5.4.0-alpha**, then land Phases 3 (compress CLI), the rest of Phase 2 (full flag-file wiring), Phase 5 (CI fan-out), and Phase 6 (release) in 5.4.0 proper. The alpha gives users a usable skill immediately while harder pieces land.

## Relationship to existing Rulebook work

- **Supersedes `TOKEN_OPTIMIZATION.md`** as the canonical output-verbosity authority. The spec file stays for the tier table, but its “Output Rules by Tier” section becomes a one-line pointer to the skill.
- **Extends `rulebook doctor`** with compression freshness and evals freshness checks.
- **Extends the MCP server** with `rulebook_compress*` and `rulebook_evals_*` tool families.
- **Dovetails with `on-compact-reinject.sh`** — a compact event can re-inject the current terse mode along with other rules.
- **Does not change** the task workflow, memory system, or existing enforcement hooks. v5.4.0 is additive.
