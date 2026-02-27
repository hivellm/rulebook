<!-- ANGULAR:START -->
# Angular Framework Rules

**CRITICAL**: Angular projects must meet these standards before delivery.

## Quality Commands
- Lint: `npm run lint`
- Unit tests: `npm run test -- --watch=false --code-coverage`
- e2e tests: `npm run e2e`
- Build: `npm run build -- --configuration production`

## Project Structure
- Colocate features inside `src/app/<feature>/`
- Keep shared modules in `src/app/shared`
- Avoid `providedIn: 'root'` unless service truly global
- Leverage `OnPush` change detection for performance-critical components

## Implementation Guidelines
- Define interfaces for component inputs/outputs
- Use `HttpClient` interceptors for auth/logging
- Isolate environment variables in `src/environments/`
- Prefer Reactive Forms and RxJS operators over manual subscriptions

## Pre-Commit Sequence
```bash
npm run lint
npm run test -- --watch=false
npm run build -- --configuration production
```

## Documentation
- Update `/docs/angular-architecture.md` with new modules and routes
- Record shared component APIs in Storybook or `/docs/ui-components.md`
- Version major route changes in `/docs/roadmap.md`

<!-- ANGULAR:END -->
