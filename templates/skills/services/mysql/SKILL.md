---
name: "MySQL"
description: "Use MySQL for relational data storage with high performance, replication, and wide ecosystem support."
version: "1.0.0"
category: "services"
author: "Rulebook"
tags: ["services", "database"]
dependencies: []
conflicts: []
---
<!-- MYSQL:START -->
# MySQL Database Instructions

**CRITICAL**: Use MySQL for relational data storage with high performance, replication, and wide ecosystem support.

## Core Features

### Connection
```typescript
// Using mysql2 (Node.js)
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
})

// Using Prisma
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
```

### Basic Queries
```typescript
// SELECT
const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId])
const users = rows as User[]

// INSERT
const [result] = await pool.execute(
  'INSERT INTO users (name, email) VALUES (?, ?)',
  ['John Doe', 'john@example.com']
)
const insertId = (result as any).insertId

// UPDATE
const [result] = await pool.execute(
  'UPDATE users SET name = ? WHERE id = ?',
  ['Jane Doe', userId]
)
const affectedRows = (result as any).affectedRows

// DELETE
const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [userId])
```

### Transactions
```typescript
const connection = await pool.getConnection()
try {
  await connection.beginTransaction()
  
  await connection.execute('INSERT INTO accounts (user_id, balance) VALUES (?, ?)', [userId, 1000])
  await connection.execute('INSERT INTO transactions (account_id, amount) VALUES (?, ?)', [accountId, 1000])
  
  await connection.commit()
} catch (error) {
  await connection.rollback()
  throw error
} finally {
  connection.release()
}
```

### Advanced Features
```typescript
// JSON queries (MySQL 5.7+)
const [rows] = await pool.execute(
  "SELECT * FROM products WHERE JSON_EXTRACT(metadata, '$.category') = ?",
  ['electronics']
)

// Full-text search
const [rows] = await pool.execute(
  "SELECT * FROM articles WHERE MATCH(title, content) AGAINST(? IN NATURAL LANGUAGE MODE)",
  ['search term']
)

// Window functions (MySQL 8.0+)
const [rows] = await pool.execute(`
  SELECT 
    name,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as rank
  FROM employees
`)

// Common Table Expressions (CTE) (MySQL 8.0+)
const [rows] = await pool.execute(`
  WITH RECURSIVE cte AS (
    SELECT id, name, parent_id FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.name, c.parent_id FROM categories c
    INNER JOIN cte ON c.parent_id = cte.id
  )
  SELECT * FROM cte
`)
```

## Common Patterns

### Connection Pooling
```typescript
// Reuse connection pool
let pool: mysql.Pool | null = null

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      // ... config
    })
    
    pool.on('connection', (connection) => {
      connection.query('SET SESSION sql_mode = "STRICT_TRANS_TABLES"')
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
// Always use parameterized queries (?) to prevent SQL injection
// ❌ WRONG
await pool.execute(`SELECT * FROM users WHERE email = '${email}'`)

// ✅ CORRECT
await pool.execute('SELECT * FROM users WHERE email = ?', [email])
```

### Error Handling
```typescript
try {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId])
  if ((rows as any[]).length === 0) {
    throw new Error('User not found')
  }
  return rows[0]
} catch (error: any) {
  if (error.code === 'ER_DUP_ENTRY') {
    throw new Error('Duplicate entry')
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    throw new Error('Referenced record does not exist')
  }
  throw error
}
```

### Migrations
```typescript
// Using db-migrate
import { migrate } from 'db-migrate'

await migrate({
  config: {
    dev: {
      driver: 'mysql',
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
    }
  },
  env: 'dev',
})
```

## Best Practices

✅ **DO:**
- Use connection pooling (10-20 connections typically)
- Always use parameterized queries (? placeholders)
- Use transactions for multi-step operations
- Create indexes on frequently queried columns
- Use EXPLAIN to optimize queries
- Enable query caching for read-heavy workloads
- Use InnoDB engine (ACID compliance)
- Set appropriate charset (utf8mb4 for full Unicode)
- Monitor slow query log
- Use prepared statements for repeated queries

❌ **DON'T:**
- Use string concatenation for queries (SQL injection risk)
- Create too many connections (exhaust pool)
- Skip error handling
- Ignore connection pool limits
- Use SELECT * in production (specify columns)
- Skip indexes on foreign keys
- Hardcode connection strings
- Use MyISAM engine (no transactions)
- Ignore query performance
- Use synchronous queries

## Configuration

### Environment Variables
```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=myapp
DB_USER=myuser
DB_PASSWORD=securepassword
DATABASE_URL=mysql://user:password@host:port/database
```

### Docker Compose
```yaml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: myapp
      MYSQL_USER: myuser
      MYSQL_PASSWORD: securepassword
      MYSQL_ROOT_PASSWORD: rootpassword
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mysql_data:
```

### Prisma Schema
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique @db.VarChar(255)
  name      String?  @db.VarChar(255)
  createdAt DateTime @default(now()) @db.Timestamp(6)
  posts     Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String   @db.VarChar(255)
  content   String?  @db.Text
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now()) @db.Timestamp(6)
  
  @@index([authorId, createdAt(sort: Desc)])
}
```

## Performance Optimization

### Indexing
```sql
-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Composite index
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC);

-- Full-text index
CREATE FULLTEXT INDEX idx_articles_content ON articles(title, content);

-- Prefix index (for long strings)
CREATE INDEX idx_users_name_prefix ON users(name(10));
```

### Query Optimization
```typescript
// Use LIMIT for pagination
const [rows] = await pool.execute(
  'SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?',
  [limit, offset]
)

// Use EXISTS instead of COUNT
const [rows] = await pool.execute(
  'SELECT EXISTS(SELECT 1 FROM users WHERE email = ?) as exists',
  [email]
)

// Use JOIN instead of subqueries when possible
const [rows] = await pool.execute(`
  SELECT u.*, COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON u.id = p.author_id
  GROUP BY u.id
`)
```

## Integration with Development

### Testing
```typescript
// Use test database
const testPool = mysql.createPool({
  database: 'myapp_test',
  // ... config
})

// Clean up after tests
afterEach(async () => {
  await testPool.execute('SET FOREIGN_KEY_CHECKS = 0')
  await testPool.execute('TRUNCATE TABLE users')
  await testPool.execute('TRUNCATE TABLE posts')
  await testPool.execute('SET FOREIGN_KEY_CHECKS = 1')
})

// Use transactions for test isolation
beforeEach(async () => {
  const connection = await testPool.getConnection()
  await connection.beginTransaction()
  // Store connection for rollback
})

afterEach(async () => {
  // Rollback transaction
})
```

### Health Checks
```typescript
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const [rows] = await pool.execute('SELECT 1 as health')
    return (rows as any[]).length > 0
  } catch {
    return false
  }
}
```

<!-- MYSQL:END -->

