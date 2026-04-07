# 01 — Project Analyses

Three real HiveLLM projects analyzed for v5.3.0.

## 1.1 `F:\Node\hivellm\tml` — TML Compiler (C++/LLVM)

**Distinctive traits**
- Rust/C++ hybrid compiler with its own MCP server (`mcp__tml__*`) exposing 17 tools (`test`, `check`, `emit-ir`, `format`, `lint`, `debug_layers`, …).
- CLAUDE.md is **1021 lines** — way over Anthropic's 200-line budget. Dominated by MANDATORY policy blocks (Teams, agent delegation, active monitoring, MCP-first).
- AGENTS.md is **6002 lines** — also huge.
- Rich `.claude/rules/` (18 files) already split by concern: `follow-task-sequence.md`, `git-safety.md`, `mcp-tool-reference.md`, `use-teams-for-multi-agent.md`, `architecture-map.md`, etc.
- `.rulebook/` is mature: `STATE.md` (hand-maintained), `PLANS.md`, `decisions/` (8 ADRs with `.metadata.json`), `knowledge/{patterns,anti-patterns}/`, `learnings/`, `ralph/`, `archive/`.
- No `.cursor/` — Claude-only project.

**Pain points rulebook should solve**
- CLAUDE.md grew organically and now *violates* Anthropic's own guidance (1021 lines in a file that should be <200). Rulebook update should detect this and refactor into imports.
- The "MANDATORY Teams", "MANDATORY MCP-first", "MANDATORY delegate implementation", "MANDATORY active monitoring" blocks are reusable policy that belongs in `templates/core/` as opt-in modules, not copy-pasted per project.
- `STATE.md` is hand-edited — it should be auto-updated by `rulebook_task_update` / Ralph iteration tracker.
- `mcp-tool-reference.md` is project-specific but the *pattern* (list MCP tools the agent should prefer) is generic — rulebook should generate it from detected MCP servers.
- The paper's own finding (§3) that LLMs skip `check` before `test` is directly experienced by this project; rulebook can codify the remediation.

**What rulebook should add**
- `templates/core/MULTI_AGENT.md` (opt-in module detected by presence of `.claude/agents/` with >5 agents).
- Auto-generation of `.claude/rules/mcp-tool-reference.md` from the MCP detection pass.
- A `rulebook doctor` check that flags any loaded instruction file over 200 lines with a concrete split plan.

## 1.2 `F:\Node\project-v` — Rust Crawler + Web (Rust/TS/Postgres)

**Distinctive traits**
- Rust workspace (`crates/`, `crawler/`, `models/`, `migrations/`, `site/`, `extension/`) + Docker Compose + PostgreSQL. Multi-language.
- CLAUDE.md is **167 lines** — the *only* one of the three that is within Anthropic's budget. It is essentially the default rulebook-generated CLAUDE.md with small edits.
- AGENTS.md is **5035 lines**.
- `.claude/rules/` has only 6 files: `follow-task-sequence.md`, `git-safety.md`, `incremental-implementation.md`, `no-shortcuts.md`, `research-first.md`, `sequential-editing.md` — almost identical to the `rulebook` repo's own `.claude/rules/`, indicating they were copied from rulebook.
- `.rulebook/decisions/` has only 2 ADRs (Portuguese titles: "manter-postgresql-como-banco-principal", "crawler-storage-zstd-shards") — shows real ADR usage but weak discipline.

**Pain points rulebook should solve**
- Ratio of AGENTS.md (5035 lines) to CLAUDE.md (167 lines) shows the current generator dumps everything into AGENTS.md. The `@import` strategy should flatten this.
- No PLANS.md, no STATE.md — session continuity is poor. `rulebook continue` skill is installed but there's nothing for it to resume from.
- Decisions are written in Portuguese while code/comments are English — rulebook should **not** enforce a language on decisions (they're user content) but should have a template in the project's primary doc language.
- Rust + Docker + Postgres triad is a common stack; the detector correctly identified it but there are no Rust-specific rules in `.claude/rules/`.

**What rulebook should add**
- Auto-generate `.claude/rules/rust.md` (with `paths: ["**/*.rs", "Cargo.toml"]`) when a Rust workspace is detected, containing clippy/fmt/test invariants.
- Bootstrap `.rulebook/STATE.md` and `.rulebook/PLANS.md` during `rulebook init` so `rulebook continue` has a target.

## 1.3 `E:\UzEngine` — C++23 Game Engine

**Distinctive traits**
- Large C++23/HLSL/Lua/TS project. ~30+ specialized sub-agents under `.claude/agents/` (cpp-core-expert, engine-architect, frostbite-architect, godot-architect, asset-pipeline-engineer, ecs-systems-engineer, …).
- CLAUDE.md is **355 lines** — over budget but not catastrophic.
- AGENTS.md is **6178 lines** — the largest of the three.
- CLAUDE.md contains **RULE -4 through RULE 1**: "NEVER REVERT", "FAIL TWICE → OPEN TEAM", "NEVER STOP TO ASK", "OBEY THE USER EXACTLY", "Falcor is the rendering baseline". These are *behavioral* rules, exactly the kind Anthropic says belong in CLAUDE.md.
- Has `.claude/hooks/`, `.claude/worktrees/`, `.claude/statusline.sh` — heavy tooling customization.
- `.rulebook/learnings/` is active (last modified yesterday).

**Pain points rulebook should solve**
- The "RULE -4 NEVER REVERT" and "FAIL TWICE → TEAM" blocks duplicate what `.claude/rules/git-safety.md` already contains. Rulebook update would deduplicate these.
- The "Falcor is ground truth" rule is project-specific scientific reference — it should live in a user-owned `CLAUDE.local.md` or `AGENTS.override.md` file that **survives `rulebook update`**. Today it's mixed into CLAUDE.md and will be clobbered on regen.
- Sub-agents under `.claude/agents/` are not managed by rulebook. v5.3.0 should at least **detect** them and preserve them during update (not delete).
- `.claude/hooks/` and `statusline.sh` are similarly unmanaged.

**What rulebook should add**
- Preserve `.claude/agents/`, `.claude/hooks/`, `.claude/statusline.sh` on update (never touch).
- Bootstrap `AGENTS.override.md` and document it as the canonical place for Falcor-style project-specific invariants.
- Rendering/graphics profile in detector (HLSL + C++ + large texture dirs → suggest the `MULTI_AGENT.md` module).

## 1.4 Comparison table

| Item | tml | project-v | UzEngine |
|------|-----|-----------|----------|
| CLAUDE.md lines | **1021** (over budget 5x) | 167 (within budget) | **355** (over budget) |
| AGENTS.md lines | 6002 | 5035 | 6178 |
| `.claude/rules/` files | 18 | 6 | (unlisted — many) |
| `.claude/agents/` files | present | — | **30+ specialists** |
| `.claude/hooks/` | yes | — | yes |
| `.rulebook/decisions/` | 8 ADRs w/ metadata | 2 ADRs (pt-BR) | present |
| `.rulebook/STATE.md` | **hand-maintained** | — | — |
| `.rulebook/PLANS.md` | yes | — | yes |
| `.rulebook/learnings/` | yes | — | active |
| MCP server | `mcp__tml__*` (custom) | rulebook-only | rulebook-only |
| Primary language | C++/Rust | Rust/TS | C++23/HLSL/Lua |
| `.cursor/` config | — | — | — |
