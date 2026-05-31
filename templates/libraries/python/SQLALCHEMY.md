<!-- SQLALCHEMY:START -->
# SQLAlchemy Rules

## Conventions
- Use SQLAlchemy 2.x-style mapped classes with `DeclarativeBase` and `Mapped[T]` / `mapped_column()` type annotations.
- Create one `sessionmaker` / `async_sessionmaker` bound to the engine at startup; inject sessions via dependency injection, not global state.
- Expire sessions explicitly after commit when needed (`session.expire_on_commit=False` for async patterns to avoid lazy-load errors).
- Use `select()`, `update()`, `delete()` Core statements with ORM entities rather than legacy `session.query()` API.
- Enable `echo=True` only in development; use `logging.getLogger("sqlalchemy.engine")` for production query logging.
- Define relationships with `relationship()` and explicit `back_populates`; set `lazy="selectin"` or `lazy="joined"` deliberately.

## Avoid
- Mixing sync and async sessions in the same code path — choose one execution style per module.
- Using `session.execute(text(...))` with f-strings — always bind parameters with `:name` placeholders.
- Relying on implicit lazy loading in async contexts; it raises `MissingGreenlet` — load eagerly or use `selectinload`.
- Calling `session.commit()` inside a repository method when the session lifecycle is owned by the caller.
<!-- SQLALCHEMY:END -->
