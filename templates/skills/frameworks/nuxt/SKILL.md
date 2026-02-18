---
name: "Nuxt"
description: "Nuxt 3 applications must keep these standards to ensure SSR quality."
version: "1.0.0"
category: "frameworks"
author: "Rulebook"
tags: ["frameworks", "framework"]
dependencies: []
conflicts: []
---
<!-- NUXT:START -->
# Nuxt Framework Rules

**CRITICAL**: Nuxt 3 applications must keep these standards to ensure SSR quality.

## Quality Commands
- Lint: `npm run lint`
- Type check: `npm run type-check`
- Unit tests: `npm run test`
- Build for production: `npm run build`
- Generate static output (if applicable): `npm run generate`

## Project Structure
- Define routes with file-based routing under `pages/`
- Keep server API handlers within `server/api/`
- Organize composables in `composables/`
- Place reusable UI components in `components/`
- Store state via Pinia modules in `stores/`

## Implementation Guidelines
- Use runtime config via `useRuntimeConfig()` for secrets
- SSR-safe operations only inside `onServerPrefetch`/server routes
- Prefer `definePageMeta` to control page-level features
- Maintain i18n messages in `/locales`
- Cache heavy computations with Nitro storage if needed

## Pre-Commit Commands
```bash
npm run lint
npm run type-check
npm run test
npm run build
```

## Documentation
- Keep `/docs/nuxt-architecture.md` current with route layout and middleware
- Document server API contracts in `/docs/api.md`
- Capture deployment steps (SSR vs static) in `/docs/deployment.md`

<!-- NUXT:END -->
