<!-- DATADOG:START -->
# Datadog — APM and Monitoring

## Initialization
- Import `dd-trace` as the FIRST import in application entry point
- Configure via environment variables: `DD_AGENT_HOST`, `DD_TRACE_AGENT_PORT`, `DD_ENV`, `DD_SERVICE`, `DD_VERSION`

## Tracing
- Use automatic instrumentation for Express, pg, Redis, etc.
- Add manual traces for business-critical operations:
  ```typescript
  const tracer = require('dd-trace');
  const span = tracer.startSpan('operation.name');
  ```

## Logs
- Inject trace IDs into log records for correlation:
  ```typescript
  const span = tracer.scope().active();
  if (span) log.info({ dd: { trace_id: span.context().toTraceId(), span_id: span.context().toSpanId() }, message });
  ```

## Custom Metrics
- Use `dogstatsd-client` for custom metrics: counters, gauges, histograms
- Tag metrics with `env`, `service`, `version` for consistent filtering
<!-- DATADOG:END -->
