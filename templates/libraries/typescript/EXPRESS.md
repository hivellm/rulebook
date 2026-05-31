<!-- EXPRESS:START -->
# Express Rules

## Conventions
- Type request and response with generics: `Request<Params, ResBody, ReqBody, Query>` — avoids `any` in handlers
- Use a centralized error-handling middleware `(err, req, res, next): void` registered last with four parameters
- Validate request bodies, params, and query strings at the route level before business logic — use Zod or a validation middleware
- Group routes by domain in separate `express.Router()` instances and mount them in `app.ts`
- Use `express.json()` and `express.urlencoded()` middleware explicitly — do not rely on body parsing being enabled by default
- Return consistent JSON error shapes: `{ error: string; code?: string }` — never leak stack traces in production

## Avoid
- Calling `next()` after sending a response — it triggers double-response errors
- Using `req.query` values as raw strings in database queries — always validate and sanitize
- Defining async route handlers without wrapping in a try/catch or using an async error wrapper — unhandled promise rejections bypass the error middleware
- Mutating `req.body` directly — treat it as read-only input
<!-- EXPRESS:END -->
