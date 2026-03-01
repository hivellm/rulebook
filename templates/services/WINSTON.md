<!-- WINSTON:START -->
# Winston — Logging

## Configuration
```typescript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()  // Always JSON in production
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  ],
});
```

## Log Levels
- Use semantic levels: `error`, `warn`, `info`, `http`, `debug`
- Set `level: 'info'` in production; `level: 'debug'` in development

## Metadata
- Include structured metadata: `logger.info('message', { userId, requestId, duration })`
- Never log sensitive data (tokens, passwords, credit card numbers)

## Custom Transports
- Add external service transports (Datadog, Loggly) as additional transports
- Always keep console transport as fallback
<!-- WINSTON:END -->
