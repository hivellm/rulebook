<!-- NESTJS:START -->
# NestJS Rules

## Conventions
- Use constructor injection for all dependencies — never instantiate services manually inside other services
- Validate all incoming DTOs with `class-validator` decorators and enable `ValidationPipe` globally with `whitelist: true, forbidNonWhitelisted: true`
- Use `@nestjs/config` with a typed `ConfigService` — never read `process.env` directly outside of config factories
- Scope providers explicitly: default (singleton) for stateless services; `REQUEST` scope only when truly per-request state is needed
- Use `@nestjs/swagger` decorators (`@ApiProperty`, `@ApiResponse`) on DTOs and controllers to keep OpenAPI spec in sync with code
- Handle async lifecycle with `OnModuleInit` and `OnApplicationShutdown` hooks — not ad-hoc timeouts

## Avoid
- Using `@Inject(TOKEN)` with string tokens for services that can be injected by class reference — string tokens lose type safety
- Throwing raw `Error` objects — use NestJS built-in exceptions (`NotFoundException`, `BadRequestException`, etc.)
- Circular module imports — restructure with a shared module or `forwardRef()` only as a last resort
- Putting business logic in controllers — controllers are thin; all logic belongs in services
<!-- NESTJS:END -->
