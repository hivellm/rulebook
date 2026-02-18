---
name: "Cassandra"
description: "Use Cassandra for distributed NoSQL database with high availability, linear scalability, and eventual consistency."
version: "1.0.0"
category: "services"
author: "Rulebook"
tags: ["services", "database"]
dependencies: []
conflicts: []
---
<!-- CASSANDRA:START -->
# Apache Cassandra Database Instructions

**CRITICAL**: Use Cassandra for distributed NoSQL database with high availability, linear scalability, and eventual consistency.

## Core Features

### Connection
```typescript
// Using cassandra-driver
import { Client } from 'cassandra-driver'

const client = new Client({
  contactPoints: (process.env.CASSANDRA_HOSTS || 'localhost').split(','),
  localDataCenter: process.env.CASSANDRA_DATACENTER || 'datacenter1',
  keyspace: process.env.CASSANDRA_KEYSPACE || 'myapp',
  credentials: {
    username: process.env.CASSANDRA_USER || 'cassandra',
    password: process.env.CASSANDRA_PASSWORD || 'cassandra',
  },
  queryOptions: {
    consistency: 1, // ONE, QUORUM, ALL
    prepare: true,
  },
})
```

### Basic Operations
```typescript
// Create keyspace
await client.execute(`
  CREATE KEYSPACE IF NOT EXISTS myapp
  WITH REPLICATION = {
    'class': 'SimpleStrategy',
    'replication_factor': 1
  }
`)

// Use keyspace
await client.execute('USE myapp')

// Create table
await client.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT,
    name TEXT,
    created_at TIMESTAMP
  )
`)

// Create index
await client.execute('CREATE INDEX IF NOT EXISTS ON users (email)')

// Insert
await client.execute(
  'INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)',
  [cassandra.types.Uuid.random(), 'john@example.com', 'John Doe', new Date()],
  { prepare: true }
)

// Select
const result = await client.execute(
  'SELECT * FROM users WHERE id = ?',
  [userId],
  { prepare: true }
)
const user = result.first()

// Update
await client.execute(
  'UPDATE users SET name = ? WHERE id = ?',
  ['Jane Doe', userId],
  { prepare: true }
)

// Delete
await client.execute(
  'DELETE FROM users WHERE id = ?',
  [userId],
  { prepare: true }
)
```

### Advanced Features
```typescript
// Batch operations
const queries = [
  {
    query: 'INSERT INTO users (id, email, name) VALUES (?, ?, ?)',
    params: [id1, 'user1@example.com', 'User 1'],
  },
  {
    query: 'INSERT INTO users (id, email, name) VALUES (?, ?, ?)',
    params: [id2, 'user2@example.com', 'User 2'],
  },
]

await client.batch(queries, { prepare: true })

// Collections
await client.execute(`
  CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY,
    name TEXT,
    tags SET<TEXT>,
    metadata MAP<TEXT, TEXT>
  )
`)

await client.execute(
  'UPDATE products SET tags = tags + ? WHERE id = ?',
  [['electronics', 'gadgets'], productId],
  { prepare: true }
)

// Time-to-Live (TTL)
await client.execute(
  'INSERT INTO sessions (id, data) VALUES (?, ?) USING TTL 3600',
  [sessionId, sessionData],
  { prepare: true }
)
```

## Common Patterns

### Data Modeling
```typescript
// Design tables for query patterns
// Query: Get users by email
await client.execute(`
  CREATE TABLE users_by_email (
    email TEXT PRIMARY KEY,
    id UUID,
    name TEXT,
    created_at TIMESTAMP
  )
`)

// Query: Get posts by user and date
await client.execute(`
  CREATE TABLE posts_by_user (
    user_id UUID,
    created_at TIMESTAMP,
    post_id UUID,
    title TEXT,
    content TEXT,
    PRIMARY KEY (user_id, created_at, post_id)
  ) WITH CLUSTERING ORDER BY (created_at DESC)
`)
```

### Consistency Levels
```typescript
// Read with QUORUM consistency
const result = await client.execute(
  'SELECT * FROM users WHERE id = ?',
  [userId],
  {
    consistency: 2, // QUORUM
    prepare: true,
  }
)

// Write with ALL consistency (strongest)
await client.execute(
  'INSERT INTO users (id, email, name) VALUES (?, ?, ?)',
  [id, email, name],
  {
    consistency: 3, // ALL
    prepare: true,
  }
)
```

## Best Practices

✅ **DO:**
- Design tables for query patterns (denormalize)
- Use appropriate partition keys
- Use clustering keys for sorting
- Create secondary indexes sparingly
- Use prepared statements
- Set appropriate consistency levels
- Use TTL for time-based data
- Monitor cluster health
- Use batch operations carefully
- Implement retry logic

❌ **DON'T:**
- Use secondary indexes on high-cardinality columns
- Create too many secondary indexes
- Use ALL consistency for all operations
- Store large values (> 1MB)
- Skip error handling
- Ignore cluster topology
- Hardcode contact points
- Use SELECT * in production
- Ignore data modeling best practices
- Skip monitoring

## Configuration

### Environment Variables
```bash
CASSANDRA_HOSTS=localhost
CASSANDRA_HOSTS=node1:9042,node2:9042,node3:9042
CASSANDRA_DATACENTER=datacenter1
CASSANDRA_KEYSPACE=myapp
CASSANDRA_USER=cassandra
CASSANDRA_PASSWORD=securepassword
```

### Docker Compose
```yaml
services:
  cassandra:
    image: cassandra:4
    ports:
      - "9042:9042"
    environment:
      CASSANDRA_CLUSTER_NAME: my-cluster
      CASSANDRA_DC: datacenter1
      CASSANDRA_RACK: rack1
      CASSANDRA_ENDPOINT_SNITCH: GossipingPropertyFileSnitch
    volumes:
      - cassandra_data:/var/lib/cassandra
    healthcheck:
      test: ["CMD-SHELL", "nodetool status | grep -E '^UN' || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  cassandra_data:
```

<!-- CASSANDRA:END -->

