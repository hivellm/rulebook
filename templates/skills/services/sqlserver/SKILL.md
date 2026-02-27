---
name: "SQL Server"
description: "Use SQL Server for enterprise relational data storage with advanced features, high availability, and Windows integration."
version: "1.0.0"
category: "services"
author: "Rulebook"
tags: ["services", "database"]
dependencies: []
conflicts: []
---
<!-- SQLSERVER:START -->
# SQL Server Database Instructions

**CRITICAL**: Use SQL Server for enterprise relational data storage with advanced features, high availability, and Windows integration.

## Core Features

### Connection
```typescript
// Using mssql (Node.js)
import sql from 'mssql'

const pool = await sql.connect({
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME || 'myapp',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.NODE_ENV === 'production',
    trustServerCertificate: process.env.NODE_ENV !== 'production',
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
})

// Using tedious (lower level)
import { Connection } from 'tedious'

const connection = new Connection({
  server: process.env.DB_HOST || 'localhost',
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
  },
  options: {
    encrypt: true,
    database: process.env.DB_NAME,
    trustServerCertificate: true,
  },
})
```

### Basic Queries
```typescript
// SELECT
const result = await pool.request()
  .input('userId', sql.Int, userId)
  .query('SELECT * FROM Users WHERE Id = @userId')
const users = result.recordset

// INSERT
const result = await pool.request()
  .input('name', sql.NVarChar, 'John Doe')
  .input('email', sql.NVarChar, 'john@example.com')
  .query('INSERT INTO Users (Name, Email) OUTPUT INSERTED.* VALUES (@name, @email)')
const newUser = result.recordset[0]

// UPDATE
const result = await pool.request()
  .input('id', sql.Int, userId)
  .input('name', sql.NVarChar, 'Jane Doe')
  .query('UPDATE Users SET Name = @name WHERE Id = @id')

// DELETE
await pool.request()
  .input('id', sql.Int, userId)
  .query('DELETE FROM Users WHERE Id = @id')
```

### Transactions
```typescript
const transaction = new sql.Transaction(pool)

try {
  await transaction.begin()
  
  const request = new sql.Request(transaction)
  await request
    .input('userId', sql.Int, userId)
    .input('amount', sql.Decimal(18, 2), 1000)
    .query('INSERT INTO Accounts (UserId, Balance) VALUES (@userId, @amount)')
  
  await request
    .input('accountId', sql.Int, accountId)
    .input('amount', sql.Decimal(18, 2), 1000)
    .query('INSERT INTO Transactions (AccountId, Amount) VALUES (@accountId, @amount)')
  
  await transaction.commit()
} catch (error) {
  await transaction.rollback()
  throw error
}
```

### Advanced Features
```typescript
// Stored procedures
const result = await pool.request()
  .input('userId', sql.Int, userId)
  .execute('sp_GetUserDetails')

// JSON operations (SQL Server 2016+)
const result = await pool.request()
  .query(`
    SELECT 
      Id,
      Name,
      JSON_VALUE(Metadata, '$.category') AS Category
    FROM Products
    WHERE JSON_VALUE(Metadata, '$.category') = 'electronics'
  `)

// Full-text search
const result = await pool.request()
  .input('searchTerm', sql.NVarChar, 'search term')
  .query(`
    SELECT * FROM Articles
    WHERE CONTAINS(Content, @searchTerm)
  `)

// Window functions
const result = await pool.request()
  .query(`
    SELECT 
      Name,
      Salary,
      ROW_NUMBER() OVER (PARTITION BY DepartmentId ORDER BY Salary DESC) AS Rank
    FROM Employees
  `)
```

## Common Patterns

### Connection Pooling
```typescript
let pool: sql.ConnectionPool | null = null

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect({
      // ... config
    })
    
    pool.on('error', (err) => {
      console.error('SQL Server pool error', err)
    })
  }
  return pool
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (pool) {
    await pool.close()
  }
  process.exit(0)
})
```

### Parameterized Queries
```typescript
// Always use parameters to prevent SQL injection
// ❌ WRONG
await pool.request().query(`SELECT * FROM Users WHERE Email = '${email}'`)

// ✅ CORRECT
await pool.request()
  .input('email', sql.NVarChar, email)
  .query('SELECT * FROM Users WHERE Email = @email')
```

### Error Handling
```typescript
try {
  const result = await pool.request()
    .input('id', sql.Int, userId)
    .query('SELECT * FROM Users WHERE Id = @id')
  
  if (result.recordset.length === 0) {
    throw new Error('User not found')
  }
  return result.recordset[0]
} catch (error: any) {
  if (error.number === 2627) { // Unique constraint violation
    throw new Error('Duplicate entry')
  }
  if (error.number === 547) { // Foreign key constraint violation
    throw new Error('Referenced record does not exist')
  }
  throw error
}
```

## Best Practices

✅ **DO:**
- Use connection pooling (10-20 connections)
- Always use parameterized queries (@param)
- Use transactions for multi-step operations
- Create indexes on frequently queried columns
- Use appropriate data types (NVarChar for Unicode)
- Enable encryption in production
- Use stored procedures for complex logic
- Monitor connection pool usage
- Use appropriate timeout values
- Implement retry logic for transient errors

❌ **DON'T:**
- Use string concatenation for queries (SQL injection risk)
- Create too many connections
- Skip error handling
- Ignore connection pool limits
- Use SELECT * in production
- Skip indexes on foreign keys
- Hardcode connection strings
- Skip encryption in production
- Ignore query performance
- Use synchronous operations

## Configuration

### Environment Variables
```bash
DB_HOST=localhost
DB_PORT=1433
DB_NAME=myapp
DB_USER=sa
DB_PASSWORD=securepassword
```

### Docker Compose
```yaml
services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    ports:
      - "1433:1433"
    environment:
      ACCEPT_EULA: Y
      SA_PASSWORD: securepassword
      MSSQL_PID: Developer
    volumes:
      - sqlserver_data:/var/opt/mssql
    healthcheck:
      test: ["CMD-SHELL", "/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P securepassword -Q 'SELECT 1' || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  sqlserver_data:
```

## Integration with Development

### Testing
```typescript
// Use test database
const testPool = await sql.connect({
  database: 'myapp_test',
  // ... config
})

// Clean up after tests
afterEach(async () => {
  await testPool.request().query('DELETE FROM Users')
  await testPool.request().query('DELETE FROM Posts')
})
```

### Health Checks
```typescript
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await pool.request().query('SELECT 1 AS Health')
    return result.recordset.length > 0
  } catch {
    return false
  }
}
```

<!-- SQLSERVER:END -->

