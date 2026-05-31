<!-- ECHO:START -->
# Echo Rules

## Conventions
- Create the server with `echo.New()` and configure `e.HideBanner = true` in production to suppress startup noise.
- Register middleware with `e.Use()` globally; use `g.Use()` on route groups for middleware scoped to a subset of routes.
- Bind and validate in one step with `c.Bind(&dto)` (calls the registered validator) or `c.Validate(&dto)` explicitly after a manual decode.
- Implement `echo.HTTPErrorHandler` on the `Echo` instance to centralise error response formatting across all handlers.
- Return errors from handlers rather than writing responses directly; Echo's error handler will translate `*echo.HTTPError` and custom error types for you.
- Use `echo.WrapHandler` or `echo.WrapMiddleware` when integrating `net/http`-compatible handlers from third-party packages.
- Set `e.Debug = true` only in development — it exposes stack traces in HTTP responses.

## Avoid
- Do not ignore the error returned by `e.Start()` or `e.StartTLS()` — wrap it in a `log.Fatal` or structured logger call.
- Do not use `context.Context` from the standard library where `echo.Context` is available; mixing them leads to redundant value lookups.
- Avoid defining route handlers as anonymous functions inline for anything beyond trivial cases — named functions improve stack traces and testability.
- Do not bind request bodies in middleware; bind only inside the handler where the expected schema is known.
<!-- ECHO:END -->
