<!-- ANGULAR:START -->
# Angular Rules

## Conventions
- Use standalone components (`standalone: true`) for all new code; NgModules are legacy in Angular 17+
- Inject dependencies with the `inject()` function inside the constructor or field initializer instead of constructor parameter injection for standalone
- Use signals (`signal()`, `computed()`, `effect()`) for reactive local state in Angular 17+; prefer over `BehaviorSubject` for component state
- Use the `@if`, `@for`, `@switch` built-in control flow blocks (Angular 17+) instead of `*ngIf`/`*ngFor` structural directives
- Always unsubscribe from Observables — prefer `takeUntilDestroyed()` from `@angular/core/rxjs-interop`
- Type HTTP responses with generics: `HttpClient.get<MyType>(url)` — never cast with `as`

## Avoid
- Using `any` type for component inputs or service return values
- Manually calling `ChangeDetectorRef.detectChanges()` when signals or `async` pipe would handle it
- Subscribing inside templates — use the `async` pipe or signal reads
- Importing `CommonModule` in standalone components — import specific directives instead
<!-- ANGULAR:END -->
