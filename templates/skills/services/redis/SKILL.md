---
name: "Redis"
description: "Use Redis for high-performance caching, session storage, pub/sub messaging, and real-time features."
version: "1.0.0"
category: "services"
author: "Rulebook"
tags: ["services", "caching"]
dependencies: []
conflicts: []
---
<!-- REDIS:START -->
# Redis Cache Instructions

**CRITICAL**: Use Redis for high-performance caching, session storage, pub/sub messaging, and real-time features.

## Core Features

### Connection
```typescript
// Using redis (Node.js)
import { createClient } from 'redis'

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        return new Error('Too many reconnection attempts')
      }
      return Math.min(retries * 100, 3000)
    },
  },
})

await client.connect()

// Using ioredis
import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
})
```

### Basic Operations
```typescript
// String operations
await client.set('user:1', JSON.stringify({ name: 'John', email: 'john@example.com' }))
await client.set('user:1', 'value', { EX: 3600 }) // Expire in 1 hour
const user = await client.get('user:1')
await client.del('user:1')

// Multiple operations
await client.mSet({
  'key1': 'value1',
  'key2': 'value2',
})
const values = await client.mGet(['key1', 'key2'])

// Increment/Decrement
await client.incr('counter')
await client.incrBy('counter', 5)
await client.decr('counter')
```

### Data Structures
```typescript
// Lists
await client.lPush('tasks', 'task1', 'task2')
await client.rPush('tasks', 'task3')
const task = await client.lPop('tasks')
const tasks = await client.lRange('tasks', 0, -1)

// Sets
await client.sAdd('tags', 'javascript', 'typescript', 'nodejs')
const tags = await client.sMembers('tags')
const exists = await client.sIsMember('tags', 'javascript')
await client.sRem('tags', 'javascript')

// Sorted Sets
await client.zAdd('leaderboard', {
  score: 100,
  value: 'player1',
})
const topPlayers = await client.zRange('leaderboard', 0, 9, { REV: true })

// Hashes
await client.hSet('user:1', {
  name: 'John',
  email: 'john@example.com',
  age: '30',
})
const user = await client.hGetAll('user:1')
await client.hIncrBy('user:1', 'age', 1)
```

### Advanced Features
```typescript
// Pub/Sub
const publisher = client.duplicate()
await publisher.connect()

const subscriber = client.duplicate()
await subscriber.connect()

await subscriber.subscribe('notifications', (message) => {
  console.log('Received:', message)
})

await publisher.publish('notifications', JSON.stringify({ type: 'alert', message: 'Hello' }))

// Streams
await client.xAdd('events', '*', {
  type: 'user_login',
  userId: '123',
  timestamp: Date.now().toString(),
})

const events = await client.xRead({
  key: 'events',
  id: '0',
}, {
  COUNT: 10,
  BLOCK: 1000,
})

// Transactions
const multi = client.multi()
multi.set('key1', 'value1')
multi.set('key2', 'value2')
multi.incr('counter')
await multi.exec()
```

## Common Patterns

### Caching
```typescript
async function getCachedUser(userId: string) {
  const cached = await client.get(`user:${userId}`)
  if (cached) {
    return JSON.parse(cached)
  }
  
  const user = await fetchUserFromDatabase(userId)
  await client.set(`user:${userId}`, JSON.stringify(user), { EX: 3600 })
  return user
}

// Cache with tags (for invalidation)
async function cacheWithTags(key: string, value: any, tags: string[], ttl: number) {
  await client.set(key, JSON.stringify(value), { EX: ttl })
  for (const tag of tags) {
    await client.sAdd(`tag:${tag}`, key)
  }
}

async function invalidateByTag(tag: string) {
  const keys = await client.sMembers(`tag:${tag}`)
  if (keys.length > 0) {
    await client.del(...keys)
  }
  await client.del(`tag:${tag}`)
}
```

### Rate Limiting
```typescript
async function checkRateLimit(userId: string, limit: number, window: number): Promise<boolean> {
  const key = `ratelimit:${userId}`
  const current = await client.incr(key)
  
  if (current === 1) {
    await client.expire(key, window)
  }
  
  return current <= limit
}
```

### Session Storage
```typescript
async function setSession(sessionId: string, data: any, ttl: number) {
  await client.set(`session:${sessionId}`, JSON.stringify(data), { EX: ttl })
}

async function getSession(sessionId: string) {
  const data = await client.get(`session:${sessionId}`)
  return data ? JSON.parse(data) : null
}

async function deleteSession(sessionId: string) {
  await client.del(`session:${sessionId}`)
}
```

### Distributed Locks
```typescript
async function acquireLock(key: string, ttl: number): Promise<boolean> {
  const result = await client.set(key, 'locked', {
    EX: ttl,
    NX: true, // Only set if not exists
  })
  return result === 'OK'
}

async function releaseLock(key: string) {
  await client.del(key)
}
```

## Best Practices

✅ **DO:**
- Use connection pooling
- Set appropriate TTL for cached data
- Use pipelining for multiple operations
- Use transactions (MULTI/EXEC) for atomic operations
- Monitor memory usage
- Use appropriate data structures (hash for objects, set for unique values)
- Implement cache invalidation strategies
- Use Redis Cluster for high availability
- Enable persistence (RDB or AOF) for production
- Use Redis Sentinel for failover

❌ **DON'T:**
- Store large values (> 100KB, use compression or external storage)
- Use Redis as primary database (it's a cache)
- Skip error handling
- Ignore memory limits
- Hardcode connection strings
- Use KEYS command in production (use SCAN instead)
- Store sensitive data without encryption
- Skip connection retry logic
- Ignore eviction policies
- Use blocking operations without timeouts

## Configuration

### Environment Variables
```bash
REDIS_URL=redis://localhost:6379
REDIS_URL=redis://:password@host:6379
REDIS_URL=rediss://host:6380  # SSL
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=securepassword
```

### Docker Compose
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass securepassword --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis_data:
```

## Integration with Development

### Testing
```typescript
// Use test Redis instance
const testClient = createClient({
  url: 'redis://localhost:6380', // Different port for tests
})

// Clean up after tests
afterEach(async () => {
  await testClient.flushDb()
})
```

### Health Checks
```typescript
async function checkRedisHealth(): Promise<boolean> {
  try {
    await client.ping()
    return true
  } catch {
    return false
  }
}
```

<!-- REDIS:END -->

