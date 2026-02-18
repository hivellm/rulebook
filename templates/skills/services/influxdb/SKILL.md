---
name: "InfluxDB"
description: "Use InfluxDB for time-series data, metrics, IoT data, and real-time analytics with high write throughput."
version: "1.0.0"
category: "services"
author: "Rulebook"
tags: ["services", "database"]
dependencies: []
conflicts: []
---
<!-- INFLUXDB:START -->
# InfluxDB Time-Series Database Instructions

**CRITICAL**: Use InfluxDB for time-series data, metrics, IoT data, and real-time analytics with high write throughput.

## Core Features

### Connection
```typescript
// Using @influxdata/influxdb-client
import { InfluxDB, Point } from '@influxdata/influxdb-client'

const token = process.env.INFLUXDB_TOKEN || ''
const org = process.env.INFLUXDB_ORG || 'myorg'
const bucket = process.env.INFLUXDB_BUCKET || 'mybucket'

const client = new InfluxDB({
  url: process.env.INFLUXDB_URL || 'http://localhost:8086',
  token,
})

const writeApi = client.getWriteApi(org, bucket, 'ns')
const queryApi = client.getQueryApi(org)
```

### Writing Data
```typescript
// Create point
const point = new Point('temperature')
  .tag('location', 'room1')
  .tag('sensor', 'sensor1')
  .floatField('value', 23.5)
  .timestamp(new Date())

writeApi.writePoint(point)

// Multiple points
const points = [
  new Point('temperature').tag('location', 'room1').floatField('value', 23.5),
  new Point('humidity').tag('location', 'room1').floatField('value', 65.2),
  new Point('pressure').tag('location', 'room1').floatField('value', 1013.25),
]

writeApi.writePoints(points)
await writeApi.close()

// Using line protocol
writeApi.writeRecord('temperature,location=room1 value=23.5')
```

### Querying Data
```typescript
// Flux query
const query = `
  from(bucket: "${bucket}")
    |> range(start: -1h)
    |> filter(fn: (r) => r._measurement == "temperature")
    |> filter(fn: (r) => r.location == "room1")
    |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
    |> yield(name: "mean")
`

queryApi.queryRows(query, {
  next(row, tableMeta) {
    const record = tableMeta.toObject(row)
    console.log(record)
  },
  error(error) {
    console.error(error)
  },
  complete() {
    console.log('Query completed')
  },
})

// InfluxQL query (legacy)
const query = `
  SELECT mean("value") 
  FROM "temperature" 
  WHERE "location" = 'room1' 
  AND time >= now() - 1h 
  GROUP BY time(5m)
`
```

## Common Patterns

### Metrics Collection
```typescript
async function recordMetric(measurement: string, tags: Record<string, string>, fields: Record<string, number>) {
  const point = new Point(measurement)
  
  for (const [key, value] of Object.entries(tags)) {
    point.tag(key, value)
  }
  
  for (const [key, value] of Object.entries(fields)) {
    point.floatField(key, value)
  }
  
  point.timestamp(new Date())
  writeApi.writePoint(point)
}

// Usage
await recordMetric('api_request', {
  endpoint: '/users',
  method: 'GET',
  status: '200',
}, {
  duration: 125.5,
  bytes: 2048,
})
```

### Aggregations
```typescript
async function getAverageTemperature(location: string, duration: string) {
  const query = `
    from(bucket: "${bucket}")
      |> range(start: ${duration})
      |> filter(fn: (r) => r._measurement == "temperature")
      |> filter(fn: (r) => r.location == "${location}")
      |> mean()
  `
  
  return new Promise((resolve, reject) => {
    const results: number[] = []
    queryApi.queryRows(query, {
      next(row, tableMeta) {
        const record = tableMeta.toObject(row)
        results.push(record._value)
      },
      error: reject,
      complete() {
        resolve(results[0] || 0)
      },
    })
  })
}
```

### Batch Writing
```typescript
class MetricsBuffer {
  private points: Point[] = []
  private maxSize = 1000
  private flushInterval = 5000 // 5 seconds
  
  constructor() {
    setInterval(() => this.flush(), this.flushInterval)
  }
  
  add(point: Point) {
    this.points.push(point)
    if (this.points.length >= this.maxSize) {
      this.flush()
    }
  }
  
  async flush() {
    if (this.points.length === 0) return
    
    const points = [...this.points]
    this.points = []
    
    for (const point of points) {
      writeApi.writePoint(point)
    }
    
    await writeApi.flush()
  }
}
```

## Best Practices

✅ **DO:**
- Use tags for frequently filtered fields
- Use fields for numeric values
- Batch writes for better performance
- Use appropriate retention policies
- Monitor disk usage
- Use downsampling for old data
- Create continuous queries for aggregations
- Use appropriate precision (ns, us, ms, s)
- Tag data with metadata (location, device, etc.)
- Monitor write performance

❌ **DON'T:**
- Store high-cardinality data in tags
- Store non-numeric data in fields
- Write points one at a time
- Ignore retention policies
- Store sensitive data without encryption
- Hardcode connection strings
- Skip error handling
- Ignore disk space
- Use too many tags (affects performance)
- Store large text in fields

## Configuration

### Environment Variables
```bash
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=your-token
INFLUXDB_ORG=myorg
INFLUXDB_BUCKET=mybucket
```

### Docker Compose
```yaml
services:
  influxdb:
    image: influxdb:2.7
    ports:
      - "8086:8086"
    environment:
      DOCKER_INFLUXDB_INIT_MODE: setup
      DOCKER_INFLUXDB_INIT_USERNAME: admin
      DOCKER_INFLUXDB_INIT_PASSWORD: securepassword
      DOCKER_INFLUXDB_INIT_ORG: myorg
      DOCKER_INFLUXDB_INIT_BUCKET: mybucket
      DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: your-token
    volumes:
      - influxdb_data:/var/lib/influxdb2
    healthcheck:
      test: ["CMD", "influx", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  influxdb_data:
```

## Integration with Development

### Testing
```typescript
// Use test bucket
const testBucket = 'test_bucket'
const testWriteApi = client.getWriteApi(org, testBucket, 'ns')

// Clean up after tests
afterEach(async () => {
  // Delete test data or use separate test bucket
})
```

### Health Checks
```typescript
async function checkInfluxDBHealth(): Promise<boolean> {
  try {
    const health = await fetch(`${process.env.INFLUXDB_URL}/health`)
    return health.ok
  } catch {
    return false
  }
}
```

<!-- INFLUXDB:END -->

