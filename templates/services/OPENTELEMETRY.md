<!-- OPENTELEMETRY:START -->
# OpenTelemetry — Distributed Tracing

## Initialization
- Initialize OTel SDK BEFORE application code (use `--require` flag or top-level import)
- Configure exporter based on environment (OTLP, Jaeger, console for dev)
- Set `serviceName` from environment: `process.env.OTEL_SERVICE_NAME`

## Instrumentation
- Use auto-instrumentation packages for common libraries (HTTP, Express, pg)
- Create manual spans for business logic operations:
  ```typescript
  const tracer = trace.getTracer('service-name');
  const span = tracer.startSpan('operation.name');
  try { ... } finally { span.end(); }
  ```

## Context Propagation
- Always propagate context across service boundaries using W3C Trace Context headers
- Use `context.with()` for async operations to preserve trace context

## Metrics
- Use `@opentelemetry/sdk-metrics` for custom metrics
- Follow naming conventions: `<namespace>.<metric_type>.<name>` (e.g., `http.server.request_count`)
<!-- OPENTELEMETRY:END -->
