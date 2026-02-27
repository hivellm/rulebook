<!-- POSTGRESQL:START -->
# PostgreSQL Database Instructions

**CRITICAL**: Use PostgreSQL for relational data storage with ACID compliance, transactions, and advanced features.

## Core Features

### Connection
```typescript
// Using pg (Node.js)
import { Pool } from 'pg'
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Using Prisma
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
```

### Basic Queries
```typescript
// SELECT
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId])
const users = result.rows

// INSERT
const result = await pool.query(
  'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
  ['John Doe', 'john@example.com']
)
const newUser = result.rows[0]

// UPDATE
const result = await pool.query(
  'UPDATE users SET name = $1 WHERE id = $2 RETURNING *',
  ['Jane Doe', userId]
)

// DELETE
await pool.query('DELETE FROM users WHERE id = $1', [userId])
```

### Transactions
```typescript
const client = await pool.connect()
try {
  await client.query('BEGIN')
  
  await client.query('INSERT INTO accounts (user_id, balance) VALUES ($1, $2)', [userId, 1000])
  await client.query('INSERT INTO transactions (account_id, amount) VALUES ($1, $2)', [accountId, 1000])
  
  await client.query('COMMIT')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
}
```

### Advanced Features
```typescript
// JSONB queries
await pool.query(
  'SELECT * FROM products WHERE metadata @> $1',
  [JSON.stringify({ category: 'electronics' })]
)

// Full-text search
await pool.query(
  "SELECT * FROM articles WHERE to_tsvector('english', content) @@ to_tsquery('english', $1)",
  ['search term']
)

// Array operations
await pool.query('SELECT * FROM posts WHERE tags && $1', [['javascript', 'typescript']])

// Window functions
await pool.query(`
  SELECT 
    name,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as rank
  FROM employees
`)
```

## Common Patterns

### Connection Pooling
```typescript
// Reuse connection pool
let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      // ... config
    })
    
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
      process.exit(-1)
    })
  }
  return pool
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (pool) {
    await pool.end()
  }
  process.exit(0)
})
```

### Prepared Statements
```typescript
// Always use parameterized queries to prevent SQL injection
// ❌ WRONG
await pool.query(`SELECT * FROM users WHERE email = '${email}'`)

// ✅ CORRECT
await pool.query('SELECT * FROM users WHERE email = $1', [email])
```

### Error Handling
```typescript
try {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId])
  if (result.rows.length === 0) {
    throw new Error('User not found')
  }
  return result.rows[0]
} catch (error) {
  if (error.code === '23505') { // Unique violation
    throw new Error('Duplicate entry')
  }
  if (error.code === '23503') { // Foreign key violation
    throw new Error('Referenced record does not exist')
  }
  throw error
}
```

### Migrations
```typescript
// Using node-pg-migrate
import { migrate } from 'node-pg-migrate'

await migrate({
  databaseUrl: process.env.DATABASE_URL,
  dir: 'migrations',
  direction: 'up',
  migrationsTable: 'pgmigrations',
  dryRun: false,
})
```

## Best Practices

✅ **DO:**
- Use connection pooling (max 20-30 connections)
- Always use parameterized queries ($1, $2, etc.)
- Use transactions for multi-step operations
- Create indexes on frequently queried columns
- Use EXPLAIN ANALYZE to optimize queries
- Enable connection pooling (PgBouncer for production)
- Use SSL in production
- Set appropriate connection timeouts
- Monitor connection pool usage
- Use prepared statements for repeated queries

❌ **DON'T:**
- Use string concatenation for queries (SQL injection risk)
- Create too many connections (exhaust pool)
- Skip error handling
- Ignore connection pool limits
- Use SELECT * in production (specify columns)
- Skip indexes on foreign keys
- Hardcode connection strings
- Skip SSL in production
- Ignore query performance
- Use synchronous queries

## Configuration

### Environment Variables
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=myuser
DB_PASSWORD=securepassword
DATABASE_URL=postgresql://user:password@host:port/database
```

### Docker Compose
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: securepassword
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Prisma Schema
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  posts     Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}
```

## Performance Optimization

### Indexing
```sql
-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Composite index
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC);

-- Partial index
CREATE INDEX idx_active_users ON users(email) WHERE active = true;

-- GIN index for JSONB
CREATE INDEX idx_products_metadata ON products USING GIN(metadata);
```

### Query Optimization
```typescript
// Use LIMIT and OFFSET for pagination
const result = await pool.query(
  'SELECT * FROM posts ORDER BY created_at DESC LIMIT $1 OFFSET $2',
  [limit, offset]
)

// Use EXISTS instead of COUNT for existence checks
const result = await pool.query(
  'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)',
  [email]
)
```

## Integration with Development

### Testing
```typescript
// Use test database
const testPool = new Pool({
  database: 'myapp_test',
  // ... config
})

// Clean up after tests
afterEach(async () => {
  await testPool.query('TRUNCATE TABLE users, posts CASCADE')
})

// Use transactions for test isolation
beforeEach(async () => {
  await testPool.query('BEGIN')
})

afterEach(async () => {
  await testPool.query('ROLLBACK')
})
```

### Health Checks
```typescript
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1')
    return result.rows.length > 0
  } catch {
    return false
  }
}
```

<!-- POSTGRESQL:END -->

