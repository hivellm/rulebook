# Proposal: Real Monorepo Support (Turborepo, Nx, pnpm Workspaces)

## Context

Monorepos are the dominant architecture for large TypeScript/JavaScript projects. Tools like Turborepo, Nx, and pnpm workspaces are used in 40%+ of enterprise Node.js projects. Rulebook currently generates a single AGENTS.md for the entire project, which is insufficient for monorepos where:

- Each package has different languages, frameworks, and dependencies
- AI agents need context scoped to the package they're editing
- Quality gates must run per-package (not just root)

## Solution

1. **Detect monorepo structure**:
   - `turbo.json` → Turborepo
   - `nx.json` → Nx
   - `pnpm-workspace.yaml` → pnpm workspaces
   - `lerna.json` → Lerna
   - `packages/*/package.json` → manual monorepo

2. **Generate per-package AGENTS.md** in each `packages/<name>/` directory
   - Run detection independently per package
   - Generate appropriate language/framework rules per package
   - Reference root `.rulebook/` specs

3. **Update root AGENTS.md** with monorepo overview and package index

4. **Ralph monorepo support**: iterate stories per-package, run quality gates per-package

## New Config

```json
"monorepo": {
  "detected": true,
  "tool": "turborepo",
  "packages": ["packages/api", "packages/web", "packages/shared"]
}
```

## Files to Modify

- `src/core/detector.ts` — detect monorepo tool and package directories
- `src/core/generator.ts` — generate per-package AGENTS.md
- `src/types.ts` — add MonorepoDetection type
- `src/core/config-manager.ts` — add monorepo config section
- `tests/monorepo.test.ts` — new test file
