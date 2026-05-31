<!-- SQLX:START -->
# SQLx Rules

## Conventions
- Use `sqlx::query_as!` and `sqlx::query!` macros for compile-time verified SQL; set `DATABASE_URL` at build time for macro expansion
- Create a connection pool with `PgPoolOptions::new().max_connections(N).connect(url).await?` and share it via `Arc` or framework state
- Run migrations at startup with `sqlx::migrate!("./migrations").run(&pool).await?`; keep migration files append-only
- Use `query.fetch_one`, `fetch_optional`, and `fetch_all` purposefully — `fetch_one` returns an error on zero rows; `fetch_optional` does not
- Wrap multi-statement operations in `pool.begin().await?` and call `tx.commit().await?` explicitly; `tx.rollback()` is called on drop
- Bind user input exclusively through `query.bind(value)` — never interpolate values into raw SQL strings

## Avoid
- Do not use `query!` macros pointing to a non-existent or out-of-date schema — the compile error is cryptic; run pending migrations first
- Do not acquire a connection manually from the pool (`pool.acquire()`) when `pool` itself implements `Executor` and can be passed directly
- Do not ignore `RowNotFound` from `fetch_one` — map it to a domain-level `NotFound` error before it reaches the API layer
- Do not store `PoolConnection<Db>` in long-lived structs; connections should be borrowed for a single logical operation, then released
<!-- SQLX:END -->
