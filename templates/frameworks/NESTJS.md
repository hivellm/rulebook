<!-- NESTJS:START -->
# NestJS Framework Rules

**CRITICAL**: Align all NestJS services, modules, and controllers with these conventions.

## Project Structure
- Maintain feature-first modules under `src/<feature>/`
- Keep global providers in `src/common/`
- Register new modules in `AppModule` and ensure dependency injection consistency
- Prefer `@nestjs/config` for environment configuration

## Quality Gates
- Lint: `npm run lint`
- Unit tests: `npm run test`
- e2e tests: `npm run test:e2e`
- Build validation: `npm run build`
- Coverage threshold: **80%+** for service and controller layers

## Implementation Guidelines
- Use DTOs with `class-validator` and `class-transformer`
- Encapsulate database access in providers (avoid direct repository use in controllers)
- Document routes with `@nestjs/swagger` when OpenAPI is enabled
- Keep asynchronous logic wrapped with `try/catch` and map errors to HTTP exceptions

## Scripts to Run Before Commit
```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

## Additional Checks
- Ensure Circular Dependency detection is clean (`npm run lint -- --max-warnings=0`)
- Synchronize `.env.example` with actual required variables
- Maintain aligned versions for Nest core packages (`@nestjs/*`)

## Documentation
- Update `/docs/architecture.md` with new modules and providers
- Keep OpenAPI spec regenerated via `npm run swagger:generate`
- Log breaking changes in `CHANGELOG.md`

<!-- NESTJS:END -->
