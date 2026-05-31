<!-- GIN:START -->
# Gin Rules

## Conventions
- Use `gin.New()` instead of `gin.Default()` in production to control which middleware is loaded; add `gin.Logger()` and `gin.Recovery()` explicitly.
- Group related routes with `r.Group("/prefix")` and attach middleware at the group level rather than the global router.
- Bind request payloads with `c.ShouldBindJSON(&dto)` (returns error) rather than `c.BindJSON` (aborts on error) so you control the error response format.
- Return structured errors via `c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})` — never write raw text responses for API handlers.
- Use `c.Set` / `c.Get` for passing values through middleware; define typed keys to avoid runtime panics from untyped interface assertions.
- Register custom validators on `binding.Validator` once at startup; do not repeat validation logic inside handlers.
- In tests, use `httptest.NewRecorder()` with `gin.SetMode(gin.TestMode)` to avoid debug output noise.

## Avoid
- Do not store mutable state in handler closures — Gin handlers run concurrently; use the context or dependency-injected services instead.
- Do not call `c.Abort()` without also writing a response — the client will hang waiting for a body.
- Avoid `gin.Default()` in production; it silently adds a logger that writes to stdout and a recovery middleware you may not have configured.
- Do not mix `c.BindJSON` and `c.ShouldBindJSON` in the same codebase — pick one convention and document it.
<!-- GIN:END -->
