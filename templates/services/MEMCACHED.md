<!-- MEMCACHED:START -->
# Memcached Cache Instructions

**CRITICAL**: Use Memcached for simple, high-performance distributed caching with minimal overhead.

## Core Features

### Connection
```typescript
// Using memcached (Node.js)
import Memcached from 'memcached'

const memcached = new Memcached(process.env.MEMCACHED_SERVERS || 'localhost:11211', {
  maxKeySize: 250,
  maxExpiration: 2592000, // 30 days
  maxValue: 1048576, // 1MB
  poolSize: 10,
  reconnect: true,
  timeout: 5000,
  retries: 3,
  retry: 1000,
  remove: true,
  idle: 5000,
})
```

### Basic Operations
```typescript
// Set
memcached.set('user:1', { name: 'John', email: 'john@example.com' }, 3600, (err) => {
  // Expires in 1 hour
})

// Get
memcached.get('user:1', (err, data) => {
  console.log(data)
})

// Delete
memcached.del('user:1', (err) => {
  // Deleted
})

// Replace (only if key exists)
memcached.replace('user:1', newData, 3600, (err) => {
  // Replaced
})

// Add (only if key doesn't exist)
memcached.add('user:1', data, 3600, (err) => {
  // Added
})
```

### Advanced Operations
```typescript
// Multiple gets
memcached.getMulti(['user:1', 'user:2', 'user:3'], (err, data) => {
  // Returns object with keys as properties
})

// Increment/Decrement
memcached.incr('counter', 1, (err, value) => {
  // Incremented
})

memcached.decr('counter', 1, (err, value) => {
  // Decremented
})

// Touch (update expiration)
memcached.touch('user:1', 7200, (err) => {
  // Expiration updated to 2 hours
})

// Stats
memcached.stats((err, stats) => {
  console.log(stats)
})
```

## Common Patterns

### Caching with Promises
```typescript
function getCached(key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    memcached.get(key, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })
}

function setCached(key: string, value: any, ttl: number): Promise<void> {
  return new Promise((resolve, reject) => {
    memcached.set(key, value, ttl, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

// Usage
async function getCachedUser(userId: string) {
  const cached = await getCached(`user:${userId}`)
  if (cached) {
    return cached
  }
  
  const user = await fetchUserFromDatabase(userId)
  await setCached(`user:${userId}`, user, 3600)
  return user
}
```

### Cache-Aside Pattern
```typescript
async function getWithCache(key: string, fetchFn: () => Promise<any>, ttl: number) {
  try {
    const cached = await getCached(key)
    if (cached) {
      return cached
    }
  } catch (err) {
    // Cache miss or error, continue to fetch
  }
  
  const data = await fetchFn()
  try {
    await setCached(key, data, ttl)
  } catch (err) {
    // Cache set failed, but we have the data
  }
  
  return data
}
```

### Rate Limiting
```typescript
async function checkRateLimit(identifier: string, limit: number, window: number): Promise<boolean> {
  const key = `ratelimit:${identifier}`
  
  return new Promise((resolve) => {
    memcached.incr(key, 1, (err, value) => {
      if (err || value === false) {
        // Key doesn't exist, create it
        memcached.set(key, 1, window, () => {
          resolve(true)
        })
      } else if (value > limit) {
        resolve(false)
      } else {
        if (value === 1) {
          // First increment, set expiration
          memcached.touch(key, window, () => {})
        }
        resolve(true)
      }
    })
  })
}
```

## Best Practices

✅ **DO:**
- Use connection pooling
- Set appropriate TTL for cached data
- Handle cache misses gracefully
- Use consistent key naming conventions
- Monitor cache hit rates
- Use multiple servers for redundancy
- Compress large values before storing
- Implement cache warming strategies
- Use appropriate data serialization
- Monitor memory usage

❌ **DON'T:**
- Store large values (> 1MB, use external storage)
- Use Memcached as primary database
- Store sensitive data without encryption
- Skip error handling
- Ignore connection failures
- Hardcode server addresses
- Use blocking operations
- Store complex nested objects (flatten when possible)
- Ignore eviction policies
- Skip monitoring

## Configuration

### Environment Variables
```bash
MEMCACHED_SERVERS=localhost:11211
MEMCACHED_SERVERS=server1:11211,server2:11211,server3:11211
```

### Docker Compose
```yaml
services:
  memcached:
    image: memcached:1.6-alpine
    ports:
      - "11211:11211"
    command: ["-m", "64", "-I", "1m"]  # 64MB memory, 1MB max item size
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "11211"]
      interval: 10s
      timeout: 5s
      retries: 5
```

## Integration with Development

### Testing
```typescript
// Use test Memcached instance
const testMemcached = new Memcached('localhost:11212') // Different port

// Clean up after tests
afterEach((done) => {
  testMemcached.flush((err) => {
    done()
  })
})
```

### Health Checks
```typescript
function checkMemcachedHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    memcached.stats((err) => {
      resolve(!err)
    })
  })
}
```

<!-- MEMCACHED:END -->

