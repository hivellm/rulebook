<!-- REACT:START -->
# React Framework Rules

**CRITICAL**: React applications must comply with these quality bars.

## Quality Commands
- Lint & type check: `npm run lint` + `npm run type-check`
- Unit/integration tests: `npm run test -- --watch=false`
- Build: `npm run build`
- Bundle analysis (optional): `npm run analyze`

## Project Structure
- Group features under `src/features/<name>/`
- Maintain shared UI primitives in `src/components`
- Keep hooks in `src/hooks`
- Centralize state management in `src/state` (Redux/Zustand/Recoil)

## Implementation Guidelines
- Use TypeScript everywhere (no implicit `any`)
- Prefer functional components with hooks
- Co-locate component tests as `<Component>.test.tsx`
- Use React Query/SWR for server state, keep caches invalidated on mutations
- Wrap new pages with error boundaries and suspense where needed

## Pre-Commit Checklist
```bash
npm run lint
npm run type-check
npm run test -- --watch=false
npm run build
```

## Documentation
- Update `/docs/react-architecture.md` when routes or global providers change
- Record reusable components in Storybook or `/docs/ui-components.md`
- Capture performance regressions in `/docs/performance.md`

<!-- REACT:END -->
