<!-- JEST:START -->
# Jest Rules

## Conventions
- Use `jest.config.ts` (TypeScript) with `ts-jest` or `@swc/jest` transform for type-safe configuration
- Mock modules with `jest.mock('../path/to/module')` at the top of the file — Jest hoists these automatically
- Use `jest.spyOn(object, 'method').mockReturnValue(value)` for partial mocks; restore with `jest.restoreAllMocks()` in `afterEach`
- Use `expect.assertions(n)` in async tests that rely on callbacks to catch silent failures
- Use `jest.useFakeTimers()` for time-dependent tests; advance with `jest.advanceTimersByTimeAsync(ms)` (Jest 29+)
- Isolate module state between tests with `jest.isolateModules()` when a module has side-effectful initialization

## Avoid
- Using `test.only` or `fdescribe` — remove before committing
- Mocking entire large modules when only one method needs to change — use `spyOn` for surgical mocking
- Relying on test execution order — each test must set up and tear down its own state independently
- Using `done` callback pattern for async tests — use `async/await` or return a Promise instead
<!-- JEST:END -->
