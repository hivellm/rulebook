# 03 — Measurement methodology (why "FAIL" overstates the problem)

**F-009 — The benchmark counts on-demand assets as always-on static context.**
Evidence: `scripts/measure-overhead.mjs` `countStaticTokens()` unconditionally
sums *all* of `.claude/rules/*` (lines 71–75), `.rulebook/STATE.md` +
`PLANS.md` (line 69), and `AGENTS.md` (line 67) into the static total. But:

- `.claude/rules/*.md` are **path-scoped** — `templates/rules/typescript.md`
  ships `paths: ["**/*.ts", ...]` frontmatter, and `rules-generator.ts`
  documents them as "loaded only when Claude reads a matching file … zero
  context budget outside the relevant file types." Counting 544 tok as
  always-on is wrong; it's on-demand.
- `.rulebook/PLANS.md` / `STATE.md` (167 tok) live under `.rulebook/` and are
  read via MCP on demand, not auto-injected by Claude Code.
- `AGENTS.md` (634 tok) is the cross-tool standard; whether Claude Code
  auto-loads it (vs only `CLAUDE.md` + `@` imports) is harness-version
  dependent — CLAUDE.md imports `@AGENTS.override.md`, not `@AGENTS.md`.

Subtracting the clearly on-demand items (rules 544 + PLANS/STATE 167) yields
**2,641**; the genuinely always-on core for a Claude Code session is closer to
**CLAUDE.md 545 + override 42 + skills/commands 522 + MCP 898 ≈ 2,007** —
already under the 2,500 budget. Confidence: high on the arithmetic; medium on
the AGENTS.md auto-load question. Impact: high for interpretation — **v7
largely met its real always-on target; the "FAIL" is mostly a counting
choice.**

**F-010 — Path-scoping is intact, but there is no guard against losing it.**
Initially this repo's own `.claude/rules/typescript.md` was suspected of
missing its `paths:` frontmatter; verification (2026-07-14, `sed -n '1,8p' |
cat -A`) shows the frontmatter **is present and correct** — no current
instance of the problem exists. What remains true: if a generated rule file
ever loses its `paths:` block (hand edit, bad merge), the path-scoping breaks
silently and that file becomes always-on context. Worth a cheap guard: an
`update`-time / benchmark-time assertion that `.claude/rules/*.md` carrying
the rulebook sentinel retain `paths:` frontmatter. Confidence: high (verified).
Impact: low (preventive only).
