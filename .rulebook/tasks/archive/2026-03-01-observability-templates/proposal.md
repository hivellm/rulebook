# Proposal: Observability Templates (Sentry, OpenTelemetry, Datadog)

## Why

To generate best-practice observability directives for projects using Sentry, OTel, Datadog, Pino, Winston, and Prometheus.

## Context

Modern production applications require observability: error tracking, distributed tracing, and metrics. AI-generated code frequently omits observability instrumentation, leading to undebuggable production issues.

Adding observability templates to rulebook ensures AI agents know how to properly instrument code.

## Solution

Detect observability tools and generate appropriate rulebook specs:

1. **Sentry** — detect `@sentry/node`, `@sentry/react`, etc. in package.json
2. **OpenTelemetry** — detect `@opentelemetry/sdk-node` or `@opentelemetry/api`
3. **Datadog** — detect `dd-trace` in dependencies
4. **Pino/Winston** — detect structured logging libraries
5. **Prometheus** — detect `prom-client`

For each detected tool, generate a spec file in `.rulebook/specs/`:
- `SENTRY.md` — error boundary patterns, release tracking, breadcrumbs
- `OPENTELEMETRY.md` — span creation, attribute naming, sampling
- `LOGGING.md` — structured log format, log levels, correlation IDs

## New Templates

- `templates/services/sentry.md`
- `templates/services/opentelemetry.md`
- `templates/services/datadog.md`
- `templates/services/logging-pino.md`
- `templates/services/prometheus.md`

## Files to Modify

- `src/core/detector.ts` — detect observability tools
- `src/types.ts` — add observability service types
- `src/core/generator.ts` — generate observability specs
- `tests/observability.test.ts` — new test file
