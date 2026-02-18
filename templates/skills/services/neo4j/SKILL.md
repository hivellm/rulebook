---
name: "Neo4j"
description: "Use Neo4j for graph data modeling, relationship traversal, and complex connected data queries."
version: "1.0.0"
category: "services"
author: "Rulebook"
tags: ["services", "database"]
dependencies: []
conflicts: []
---
<!-- NEO4J:START -->
# Neo4j Graph Database Instructions

**CRITICAL**: Use Neo4j for graph data modeling, relationship traversal, and complex connected data queries.

## Core Features

### Connection
```typescript
// Using neo4j-driver
import neo4j from 'neo4j-driver'

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  ),
  {
    maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
  }
)

const session = driver.session()
```

### Basic Operations
```typescript
// Create node
const result = await session.run(
  'CREATE (u:User {id: $id, name: $name, email: $email}) RETURN u',
  { id: '1', name: 'John Doe', email: 'john@example.com' }
)

// Create relationship
await session.run(
  'MATCH (u:User {id: $userId}), (p:Post {id: $postId}) CREATE (u)-[:CREATED]->(p)',
  { userId: '1', postId: '1' }
)

// Find nodes
const result = await session.run(
  'MATCH (u:User {email: $email}) RETURN u',
  { email: 'john@example.com' }
)
const user = result.records[0]?.get('u')

// Update node
await session.run(
  'MATCH (u:User {id: $id}) SET u.name = $name, u.updatedAt = $updatedAt',
  { id: '1', name: 'Jane Doe', updatedAt: new Date().toISOString() }
)

// Delete node and relationships
await session.run(
  'MATCH (u:User {id: $id}) DETACH DELETE u',
  { id: '1' }
)
```

### Advanced Queries
```typescript
// Find relationships
const result = await session.run(`
  MATCH (u:User)-[r:FOLLOWS]->(f:User)
  WHERE u.id = $userId
  RETURN f, r.createdAt
  ORDER BY r.createdAt DESC
  LIMIT 10
`, { userId: '1' })

// Shortest path
const result = await session.run(`
  MATCH path = shortestPath(
    (start:User {id: $startId})-[*]-(end:User {id: $endId})
  )
  RETURN path, length(path) as distance
`, { startId: '1', endId: '2' })

// Pattern matching
const result = await session.run(`
  MATCH (u:User)-[:CREATED]->(p:Post)-[:TAGGED_WITH]->(t:Tag)
  WHERE t.name = $tagName
  RETURN u, count(p) as postCount
  ORDER BY postCount DESC
`, { tagName: 'javascript' })

// Aggregations
const result = await session.run(`
  MATCH (u:User)-[:FOLLOWS]->(f:User)
  RETURN u.id, count(f) as followerCount
  ORDER BY followerCount DESC
  LIMIT 10
`)
```

## Common Patterns

### User Recommendations
```typescript
async function getRecommendedUsers(userId: string) {
  const result = await session.run(`
    MATCH (u:User {id: $userId})-[:FOLLOWS]->(f:User)-[:FOLLOWS]->(recommended:User)
    WHERE NOT (u)-[:FOLLOWS]->(recommended) AND u <> recommended
    RETURN recommended, count(recommended) as mutualFollowers
    ORDER BY mutualFollowers DESC
    LIMIT 10
  `, { userId })
  
  return result.records.map(record => ({
    user: record.get('recommended').properties,
    score: record.get('mutualFollowers').toNumber(),
  }))
}
```

### Graph Traversal
```typescript
async function findConnections(userId: string, depth: number) {
  const result = await session.run(`
    MATCH path = (start:User {id: $userId})-[*1..${depth}]-(connected:User)
    RETURN connected, length(path) as distance
    ORDER BY distance
  `, { userId })
  
  return result.records.map(record => ({
    user: record.get('connected').properties,
    distance: record.get('distance').toNumber(),
  }))
}
```

### Transaction
```typescript
const session = driver.session()
const tx = session.beginTransaction()

try {
  await tx.run('CREATE (u:User {id: $id, name: $name})', { id: '1', name: 'John' })
  await tx.run('CREATE (p:Post {id: $id, title: $title})', { id: '1', title: 'Post 1' })
  await tx.run(
    'MATCH (u:User {id: $userId}), (p:Post {id: $postId}) CREATE (u)-[:CREATED]->(p)',
    { userId: '1', postId: '1' }
  )
  await tx.commit()
} catch (error) {
  await tx.rollback()
  throw error
} finally {
  await session.close()
}
```

## Best Practices

✅ **DO:**
- Use parameterized queries ($param)
- Create indexes on frequently queried properties
- Use appropriate relationship types
- Batch operations when possible
- Close sessions after use
- Use transactions for multi-step operations
- Monitor query performance
- Use appropriate data types
- Implement connection pooling
- Use labels effectively

❌ **DON'T:**
- Use string concatenation for queries (injection risk)
- Create too many relationships per node
- Skip error handling
- Ignore query performance
- Hardcode connection strings
- Store large properties (use external storage)
- Skip indexes on lookup properties
- Ignore transaction boundaries
- Use synchronous operations
- Store sensitive data without encryption

## Configuration

### Environment Variables
```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_URI=neo4j+s://cluster.example.com:7687  # SSL
NEO4J_USER=neo4j
NEO4J_PASSWORD=securepassword
```

### Docker Compose
```yaml
services:
  neo4j:
    image: neo4j:5
    ports:
      - "7474:7474"  # HTTP
      - "7687:7687"  # Bolt
    environment:
      NEO4J_AUTH: neo4j/securepassword
      NEO4J_PLUGINS: '["apoc"]'
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
    healthcheck:
      test: ["CMD", "cypher-shell", "-u", "neo4j", "-p", "securepassword", "RETURN 1"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  neo4j_data:
  neo4j_logs:
```

## Integration with Development

### Testing
```typescript
// Use test database
const testDriver = neo4j.driver('bolt://localhost:7688', neo4j.auth.basic('neo4j', 'test'))

// Clean up after tests
afterEach(async () => {
  const session = testDriver.session()
  await session.run('MATCH (n) DETACH DELETE n')
  await session.close()
})
```

### Health Checks
```typescript
async function checkNeo4jHealth(): Promise<boolean> {
  try {
    const session = driver.session()
    const result = await session.run('RETURN 1 as health')
    await session.close()
    return result.records.length > 0
  } catch {
    return false
  }
}
```

<!-- NEO4J:END -->

