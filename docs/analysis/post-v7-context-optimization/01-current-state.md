# 01 — Current state (measured)

All numbers from `node scripts/measure-overhead.mjs` on `release/v7.0.0`
(`bd61e45`, 2026-07-14), fresh `init --yes --tools claude-code` TS fixture.

## Ledger row

```
| 2026-07-14 | bd61e45 | post-v7 audit | 3352 | 5/3592B/210ms | P:1 S:0 St:0 U:0 | 29 |
```

## Findings

**F-001 — Static-token budget still fails: 3,352 vs 2,500 target.**
Evidence: `budgets.staticTokens: false` in the script output. The gap is +852.
Confidence: high (direct measurement). Impact: low-medium — see F-009 in
[03](03-measurement-methodology.md): most of the overage is on-demand content
the benchmark mis-classifies as always-on.

Breakdown (tokens):

| Component | Tokens |
|---|---:|
| CLAUDE.md | 545 |
| AGENTS.md | 634 |
| AGENTS.override.md | 42 |
| STATE.md + PLANS.md | 167 |
| `.claude/rules/*` | 544 |
| skills + commands frontmatter | 522 |
| MCP schemas (est.) | 898 |
| **Total** | **3,352** |

**F-002 — Installed-file budget fails: 29 vs 20.**
Evidence: `installedFiles: 29`; the fixture tree shows 12
`.claude/commands/rulebook-*.md`, 5 `.rulebook/specs/*.md`, 2 skills, 1 rule,
plus settings/hooks/config/state. The 12 command files alone are the overage.
Confidence: high. Impact: medium (repo noise, upgrade churn).

**F-003 — MCP init 210 ms exceeds the 150 ms budget, Windows only.**
Evidence: `mcp.initMs: 210` here; the v7-performance ledger records the same
server at "232 ms Win / <150 ms Linux". `.mcp.json` already points at the slim
`dist/mcp/rulebook-server.js` (no CLI deps) — the residual is Node spawn +
Windows Defender overhead, not Rulebook code. Confidence: high. Impact: low
(paid once per session; passes on Linux CI). **Recommendation: accept, or
raise the Windows budget to 250 ms with a comment.**
