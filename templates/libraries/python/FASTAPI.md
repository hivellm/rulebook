<!-- FASTAPI:START -->
# FastAPI Rules

## Conventions
- Declare request bodies and responses as Pydantic models; use `response_model=` on every route to enforce output shape.
- Use `Depends()` for dependency injection (database sessions, auth, config); keep dependencies composable and testable.
- Organize routes in `APIRouter` instances per domain, then `app.include_router()` in `main.py` with a prefix and tags.
- Use `async def` for I/O-bound endpoints; use `def` (sync) only for CPU-bound work that does not block the event loop.
- Return explicit HTTP status codes via `status_code=` on the decorator or raise `HTTPException(status_code=..., detail=...)`.
- Use `lifespan` context manager (FastAPI 0.93+) instead of deprecated `@app.on_event("startup"/"shutdown")`.
- Enable `response_model_exclude_unset=True` on endpoints that do partial updates to avoid sending default values.

## Avoid
- Putting database calls directly in route functions — delegate to a repository or service layer.
- Sharing a single `requests.Session` or sync client across async routes; use `httpx.AsyncClient` with `async with`.
- Raising bare Python exceptions; always raise `HTTPException` or a custom handler registered via `app.exception_handler`.
- Ignoring `openapi_extra` for non-standard response codes — document all 4xx/5xx you actually raise.
<!-- FASTAPI:END -->
