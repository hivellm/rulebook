<!-- SENTRY:START -->
# Sentry — Error Tracking

## Configuration
- Initialize Sentry at application entry point BEFORE other imports
- Set `dsn` from environment variable: `process.env.SENTRY_DSN`
- Configure `environment` from `NODE_ENV`
- Enable `tracesSampleRate: 0.1` in production (not 1.0)

## Error Capture
- Wrap route handlers with Sentry error middleware
- Use `Sentry.captureException(err)` in catch blocks for unexpected errors
- Add custom context: `Sentry.setContext('user', { id, email })`
- Never log sensitive data (passwords, tokens) in Sentry context

## Release Tracking
- Set `release` using git commit SHA: `process.env.SENTRY_RELEASE`
- Run `sentry-cli releases` in CI to associate commits with releases

## Performance
- Use `Sentry.startTransaction()` for tracking custom operations
- Add distributed tracing headers to internal service calls
<!-- SENTRY:END -->
