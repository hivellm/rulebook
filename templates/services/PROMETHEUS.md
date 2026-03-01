<!-- PROMETHEUS:START -->
# Prometheus — Metrics

## Setup
```typescript
import { Registry, collectDefaultMetrics } from 'prom-client';
const registry = new Registry();
collectDefaultMetrics({ register: registry });
```

Expose metrics endpoint:
```typescript
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
```

## Metric Types
- **Counter**: Monotonically increasing values (`http_requests_total`)
- **Gauge**: Values that go up and down (`active_connections`, memory usage)
- **Histogram**: Duration/size distributions (`http_request_duration_seconds`)
- **Summary**: Percentile calculations (use Histogram instead when possible)

## Naming Conventions
- Format: `<namespace>_<metric_name>_<unit>` (e.g., `app_http_request_duration_seconds`)
- Use `_total` suffix for counters
- Include all relevant labels: `{ method, route, status_code }`

## Alerting
- Define recording rules for frequently queried expressions
- Set alert thresholds: error rate > 5%, p99 latency > 2s, memory > 80%
<!-- PROMETHEUS:END -->
