# 06 — Docs Sprawl

No token cost — none of this is loaded by agents. The cost is readers not knowing which document describes today's Rulebook.

## F-028 — 78 files in `docs/`, about 30 pre-v7 or report-style

**Evidence**:

| Location | Files to archive | Why |
|---|---|---|
| `docs/` top level | `FINAL_REPORT.md` (491), `STATUS.md` (397), `ROADMAP.md` (327), `PERFORMANCE_REPORT.md` (183), `SUMMARY.md` (414, duplicates README), `RELEASE_NOTES.md` (v6), `V5_ARCHITECTURE.md`, `AGENT_TEST_COMMANDS.md` | Point-in-time reports or superseded |
| `docs/` top level | `MIGRATION_GUIDE`, `MIGRATION_V2`, `OPENSPEC_MIGRATION` | Predate v6 → v7 |
| `docs/analysis/` root | 7 v5 files (`00-INDEX.md` .. `07-v5-recommendations.md`) | Pre-v7 |
| `docs/analysis/v5.3.0/` | 11 files | Superseded |
| `docs/analysis/caveman/` | 6 files | Pre-v7 |
| `docs/guides/rulebook-terse.md` | 1 | Documents a retired mode |

`ARCHITECTURE.md` (57 lines) still needs to describe v7. Recon 02 counted 77 files; the synthesis counts 78.
**Impact**: maintainer and newcomer confusion.
**Confidence**: high.
**Recommendation**: move the ~30 files to `docs/archive/<original-path>` with a one-line index; refresh `ARCHITECTURE.md` for v7. Zero code impact. Not breaking.
