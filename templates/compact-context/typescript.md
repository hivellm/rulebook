# Post-compaction cheat sheet (TypeScript project)

Re-injected after every compaction. Keep ≤50 lines. Edit freely.

## Critical reminders

- Read `AGENTS.md` and `AGENTS.override.md` before changes.
- `npm run type-check` before `npm test` — type errors are cheaper.
- `npm run lint` must pass with zero warnings.
- Edit files sequentially, not in parallel.
- Never revert uncommitted work; fix forward.
- If a fix fails twice, stop and escalate.
- Use MCP tools (`mcp__rulebook__*`) over shell where available.

## Build & test quick reference

- **Install**: `npm install`
- **Build**: `npm run build` (TypeScript → `dist/`)
- **Type-check**: `npm run type-check`
- **Lint**: `npm run lint`
- **Test**: `npm test` (or `npx vitest run <file>` for single file)
- **Dev**: `npm run dev`

## Forbidden

- No `any` without justification.
- No `// @ts-ignore` without a one-line reason.
- No new dependencies without explicit authorization.
- No `rm -rf` in this repo.
