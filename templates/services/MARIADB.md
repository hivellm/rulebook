<!-- MARIADB:START -->
# MariaDB Database Instructions

**CRITICAL**: Use MariaDB for MySQL-compatible relational database with enhanced features, performance improvements, and open-source licensing.

## Core Features

### Connection
```typescript
// Using mysql2 (compatible with MySQL)
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'myapp',
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

// DELETE
await pool.execute('DELETE FROM users WHERE id = ?', [userId])
```

### Advanced Features
```typescript
// JSON operations (MariaDB 10.2.7+)
const [rows] = await pool.execute(
  "SELECT * FROM products WHERE JSON_EXTRACT(metadata, '$.category') = ?",
  ['electronics']
)

// Window functions (MariaDB 10.2+)
const [rows] = await pool.execute(`
  SELECT 
    name,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as rank
  FROM employees
`)

// Common Table Expressions (CTE) (MariaDB 10.2+)
const [rows] = await pool.execute(`
  WITH RECURSIVE cte AS (
    SELECT id, name, parent_id FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.name, c.parent_id FROM categories c
    INNER JOIN cte ON c.parent_id = cte.id
  )
  SELECT * FROM cte
`)

// Sequences (MariaDB 10.3+)
await pool.execute('CREATE SEQUENCE user_id_seq START WITH 1 INCREMENT BY 1')
const [result] = await pool.execute('SELECT NEXT VALUE FOR user_id_seq')
```

## Common Patterns

### Connection Pooling
```typescript
let pool: mysql.Pool | null = null

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      // ... config
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
  throw error
}
```

## Best Practices

✅ **DO:**
- Use connection pooling (10-20 connections)
- Always use parameterized queries (?)
- Use transactions for multi-step operations
- Create indexes on frequently queried columns
- Use InnoDB engine (ACID compliance)
- Set appropriate charset (utf8mb4)
- Monitor slow query log
- Use prepared statements

❌ **DON'T:**
- Use string concatenation for queries
- Create too many connections
- Skip error handling
- Use MyISAM engine
- Hardcode connection strings
- Ignore query performance

## Configuration

### Environment Variables
```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=myapp
DB_USER=myuser
DB_PASSWORD=securepassword
```

### Docker Compose
```yaml
services:
  mariadb:
    image: mariadb:11
    environment:
      MYSQL_DATABASE: myapp
      MYSQL_USER: myuser
      MYSQL_PASSWORD: securepassword
      MYSQL_ROOT_PASSWORD: rootpassword
    ports:
      - "3306:3306"
    volumes:
      - mariadb_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mariadb_data:
```

<!-- MARIADB:END -->

