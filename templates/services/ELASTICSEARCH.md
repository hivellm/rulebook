<!-- ELASTICSEARCH:START -->
# Elasticsearch Search Instructions

**CRITICAL**: Use Elasticsearch for full-text search, log aggregation, and real-time analytics with distributed architecture.

## Core Features

### Connection
```typescript
// Using @elastic/elasticsearch
import { Client } from '@elastic/elasticsearch'

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USER || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
  },
  maxRetries: 5,
  requestTimeout: 60000,
  sniffOnStart: true,
  sniffInterval: 30000,
})
```

### Index Operations
```typescript
// Create index
await client.indices.create({
  index: 'users',
  body: {
    mappings: {
      properties: {
        name: { type: 'text' },
        email: { type: 'keyword' },
        age: { type: 'integer' },
        createdAt: { type: 'date' },
      },
    },
    settings: {
      number_of_shards: 1,
      number_of_replicas: 1,
    },
  },
})

// Delete index
await client.indices.delete({ index: 'users' })

// Check if index exists
const exists = await client.indices.exists({ index: 'users' })
```

### Document Operations
```typescript
// Index document
await client.index({
  index: 'users',
  id: '1',
  body: {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    createdAt: new Date(),
  },
})

// Get document
const result = await client.get({
  index: 'users',
  id: '1',
})

// Update document
await client.update({
  index: 'users',
  id: '1',
  body: {
    doc: {
      age: 31,
    },
  },
})

// Delete document
await client.delete({
  index: 'users',
  id: '1',
})

// Bulk operations
await client.bulk({
  body: [
    { index: { _index: 'users', _id: '1' } },
    { name: 'User 1', email: 'user1@example.com' },
    { index: { _index: 'users', _id: '2' } },
    { name: 'User 2', email: 'user2@example.com' },
  ],
})
```

### Search Operations
```typescript
// Simple search
const result = await client.search({
  index: 'users',
  body: {
    query: {
      match: {
        name: 'John',
      },
    },
  },
})

// Multi-match search
const result = await client.search({
  index: 'users',
  body: {
    query: {
      multi_match: {
        query: 'search term',
        fields: ['name^2', 'email'], // name has 2x boost
      },
    },
  },
})

// Bool query (AND/OR/NOT)
const result = await client.search({
  index: 'users',
  body: {
    query: {
      bool: {
        must: [
          { match: { name: 'John' } },
          { range: { age: { gte: 18, lte: 65 } } },
        ],
        must_not: [
          { term: { status: 'inactive' } },
        ],
        should: [
          { match: { tags: 'premium' } },
        ],
        minimum_should_match: 1,
      },
    },
  },
})

// Aggregations
const result = await client.search({
  index: 'users',
  body: {
    aggs: {
      age_groups: {
        range: {
          field: 'age',
          ranges: [
            { to: 25 },
            { from: 25, to: 50 },
            { from: 50 },
          ],
        },
      },
      avg_age: {
        avg: { field: 'age' },
      },
    },
  },
})
```

## Common Patterns

### Full-Text Search
```typescript
async function searchUsers(query: string, filters?: any) {
  const must: any[] = [
    {
      multi_match: {
        query,
        fields: ['name^2', 'email'],
        fuzziness: 'AUTO',
      },
    },
  ]
  
  if (filters) {
    if (filters.age) {
      must.push({ range: { age: filters.age } })
    }
    if (filters.status) {
      must.push({ term: { status: filters.status } })
    }
  }
  
  const result = await client.search({
    index: 'users',
    body: {
      query: {
        bool: {
          must,
        },
      },
      highlight: {
        fields: {
          name: {},
          email: {},
        },
      },
    },
  })
  
  return result.body.hits.hits.map(hit => ({
    ...hit._source,
    score: hit._score,
    highlights: hit.highlight,
  }))
}
```

### Auto-complete
```typescript
// Create index with completion suggester
await client.indices.create({
  index: 'suggestions',
  body: {
    mappings: {
      properties: {
        name: {
          type: 'text',
          fields: {
            suggest: {
              type: 'completion',
            },
          },
        },
      },
    },
  },
})

// Search with suggestions
const result = await client.search({
  index: 'suggestions',
  body: {
    suggest: {
      name_suggest: {
        prefix: 'joh',
        completion: {
          field: 'name.suggest',
        },
      },
    },
  },
})
```

## Best Practices

✅ **DO:**
- Use appropriate field types (text vs keyword)
- Create indexes with proper mappings
- Use bulk API for multiple operations
- Implement proper error handling
- Use aliases for zero-downtime reindexing
- Monitor cluster health
- Use appropriate shard and replica counts
- Implement search result pagination
- Use filters for exact matches (faster than queries)
- Enable slow query logging

❌ **DON'T:**
- Store large binary data (use external storage)
- Use too many shards (1 per 10-50GB)
- Skip mapping definitions
- Ignore cluster health
- Hardcode connection strings
- Use wildcard queries in production
- Skip error handling
- Ignore query performance
- Store sensitive data without encryption
- Use default refresh interval for real-time needs

## Configuration

### Environment Variables
```bash
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=securepassword
```

### Docker Compose
```yaml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  elasticsearch_data:
```

## Integration with Development

### Testing
```typescript
// Use test index
const testIndex = 'test_users'

beforeEach(async () => {
  await client.indices.create({ index: testIndex })
})

afterEach(async () => {
  await client.indices.delete({ index: testIndex })
})
```

### Health Checks
```typescript
async function checkElasticsearchHealth(): Promise<boolean> {
  try {
    const response = await client.cluster.health()
    return response.body.status !== 'red'
  } catch {
    return false
  }
}
```

<!-- ELASTICSEARCH:END -->

