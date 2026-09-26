# 04 — Template Weight and Reachability

Templates are large but mostly opt-in. They cost package size and upkeep, not always-loaded tokens. The real waste is templates no code path can reach.

## F-021 — Where template weight actually sits

**Evidence**: 183 files / 17,540 lines.

| Group | Files | Lines |
|---|---:|---:|
| Language skills | 28 | 10,417 (59 %) |
| CI workflows (`templates/workflows/`) | 40 | 2,261 |
| Hook scripts (`templates/hooks/*.sh`) | 32 | 1,198 |
| Claude workflows | 6 | 958 |
| Languages (`templates/languages/`) | 19 | 632 |
| Core (`templates/core/`) | 9 | 476 |
| Dev skills | 16 | 330 |
| Agents | 11 | 250 |

Language skills are copied to `.claude/skills/<name>/SKILL.md` only when enabled, and only their names appear in the full AGENTS.md (`generator.ts:985-1020`). Lean mode lists nothing.
**Impact**: tokens — none always-loaded; templates do not threaten the budget. Cost is package size and maintenance.
**Confidence**: high.
**Recommendation**: no bulk deletion of language skills; they are opt-in and cheap at runtime. Weight reduction comes from F-008 (CI) and F-003 (agents/workflows).

## F-022 — Detector, hook map, CI generator and skills disagree on the language set

**Evidence**:

| Component | Languages | Gap |
|---|---:|---|
| Detector (`detector.ts:107-336`) | 17 | — |
| `LANGUAGE_HOOK_MAP` (`git-hooks.ts:16-33`) | 16 keys | csharp, php, elixir, kotlin, swift never detected → 10 hook scripts unreachable |
| CI generator | 5 | see F-008 |
| Language skills | 28 | 11 undetected: ada, c, csharp, elixir, kotlin, lisp, objectivec, php, sas, sql, swift |
| `templates/languages` | 19 | 9 undetected |

**[recon corrected]**: `templates/hooks/` is 15 language pairs + 2 guard scripts (`protect-task-scaffolding.sh`, `no-os-scheduling.sh`) + 5 `.md` files, not 16 pairs.
**Impact**: user-facing — assets exist but never install for C#, Kotlin, PHP, Swift and Elixir projects.
**Confidence**: high.
**Recommendation**: add detector entries for csharp (`*.csproj` / `*.sln`), kotlin (`build.gradle.kts`), php (`composer.json`), swift (`Package.swift`), elixir (`mix.exs`) — ~15 lines each. That makes 10 hooks, their CI templates and 5 skills reachable. Leave ada, lisp, objectivec, sas, sql as opt-in skills (Q2). Not breaking. The C# CI templates are named `dotnet-*` (see F-008).

## F-023 — Language hook scripts repeat boilerplate

**Evidence**: recon 03, not re-measured. Pre-commit scripts total 664 lines, ~20–30 % shared structure. Pre-push scripts total 420 lines, 60–70 % boilerplate (echo, test/build/security, echo, exit).
**Impact**: maintainer, low — a fix to shared logic must be repeated per script.
**Confidence**: medium.
**Recommendation**: keep as-is. The scripts are copied verbatim into user repos; a parametrised generator trades ~400 lines of readable shell for a command table plus a templating step users cannot inspect. Revisit only if one hook bug has to be fixed in more than 3 scripts at once.

## F-024 — Dev skills, agents and workflows overlapping the native harness

**Evidence**: v7 already cut default dev skills to `analysis` and `spec` (`claude-mcp.ts:146`). The other 14 are opt-in, ~300 lines total. Recon 03 notes overlaps: `review` ↔ `/code-review` and the code-reviewer agent; `research` ↔ Explore; `feature-pipeline.js` ↔ the feature-dev plugin. Agents/workflows: see F-003.
**Impact**: negligible weight; mild confusion over which tool to use.
**Confidence**: high on the defaults; medium on the overlaps (recon only).
**Recommendation**: keep the opt-in dev skills. Resolve agents/workflows via Q1.
