<!-- AXUM:START -->
# Axum Rules

## Conventions
- Define routes with `Router::new().route("/path", get(handler))` and compose sub-routers via `Router::merge` or `Router::nest`
- Extract shared state via `State<Arc<AppState>>` derived from `axum::extract::State`; register it with `Router::with_state`
- Use typed extractors (`Json<T>`, `Path<T>`, `Query<T>`) as handler function arguments; let Axum reject invalid requests automatically
- Return `impl IntoResponse` from handlers; use `(StatusCode, Json<T>)` tuples or a custom error type that implements `IntoResponse`
- Apply middleware with `tower::ServiceBuilder` and `.layer()`; keep middleware order explicit (outermost = first to run)
- Handle errors uniformly: define an `AppError(anyhow::Error)` newtype that implements `IntoResponse` returning structured JSON
- Use `axum::serve(listener, app)` (axum 0.7+) instead of the deprecated `axum::Server::bind`

## Avoid
- Do not store non-`Clone` or non-`Send` types directly in `State`; wrap in `Arc<Mutex<T>>` when mutation is needed
- Do not ignore extractor rejection by returning `200 OK` — let the extractor's `rejection` propagate or map it explicitly
- Do not mix `axum` 0.6 and 0.7 APIs in the same project; the handler and middleware traits changed incompatibly
- Do not spawn blocking work inside async handlers — use `tokio::task::spawn_blocking` instead
<!-- AXUM:END -->
