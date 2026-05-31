<!-- ACTIX:START -->
# Actix Web Rules

## Conventions
- Bootstrap with `HttpServer::new(|| App::new().service(...)).bind(addr)?.run().await`
- Register shared data with `App::app_data(web::Data::new(state))`; extract it in handlers via `web::Data<T>`
- Group related routes under `web::scope("/prefix")` and register with `App::service(scope)`
- Use `web::Json<T>` extractor for request bodies; configure size limits via `web::JsonConfig::default().limit(bytes)`
- Return `impl Responder` or `actix_web::Result<impl Responder>`; use `HttpResponse::Ok().json(body)` for JSON responses
- Define custom error types implementing `actix_web::ResponseError` to produce structured error responses with correct status codes

## Avoid
- Do not call blocking code directly in handler async functions — use `web::block(|| ...)` to offload to the blocking thread pool
- Do not hold `Mutex`-locked state across `.await` points inside handlers; deadlocks are silent
- Do not clone `web::Data<T>` to pass ownership — `Data<T>` is already an `Arc` wrapper, pass it directly
- Do not ignore the `JsonConfig` error handler; without it, malformed JSON returns a generic 400 with no actionable message
<!-- ACTIX:END -->
