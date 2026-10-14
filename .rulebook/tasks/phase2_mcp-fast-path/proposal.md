# Proposal: phase2_mcp-fast-path

## Why
Pinning removes version drift but npx still costs ~0.8–0.9 s and 3 extra processes per session; `node` + absolute path is 1 process and 234–310 ms, but a machine-specific path cannot live in the checked-in .mcp.json (docs/analysis/multi-session-performance/03-mcp-lifecycle.md F-013, options table). Blocked on operator decision Q4.

## What Changes
- Opt-in fast path: `node <installed>/dist/mcp/rulebook-server.js` written to local/user scope.
- Bundled single-file server entry (measured 147–163 ms vs 244–264 ms init).

## Impact
- Affected specs: docs/analysis/multi-session-performance/08-execution-plan.md
- Affected code: src/core/claude/claude-mcp.ts, src/cli/commands/mcp.ts, build config (bundle), package.json
- Breaking change: NO
- User benefit: 1 process and ≤ 300 ms init per session on the fast path (from 4 and 931–1,734 ms).
