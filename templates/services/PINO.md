<!-- PINO:START -->
# Pino — Structured Logging

## Configuration
- Create singleton logger instance: `const logger = pino({ level: process.env.LOG_LEVEL || 'info' })`
- Use child loggers for request context: `req.log = logger.child({ requestId: req.id })`
- Configure pretty print for development only: `transport: { target: 'pino-pretty' }` (only when `NODE_ENV !== 'production'`)

## Log Levels
- `error`: Unexpected errors requiring immediate attention
- `warn`: Recoverable errors, deprecated usage, approaching limits
- `info`: Significant state changes, important business events
- `debug`: Detailed flow for troubleshooting (disabled in production)
- `trace`: High-frequency diagnostic data (never in production)

## Structured Fields
- Always include: `{ service, version, requestId, userId }` in request context
- Never log: passwords, tokens, credit cards, PII fields
- Log all outgoing HTTP calls with: `{ method, url, statusCode, duration }`

## Performance
- Avoid `JSON.stringify()` in log calls — pino handles serialization
- Use `logger.isLevelEnabled('debug')` before expensive debug computations
<!-- PINO:END -->
