<!-- ORACLE:START -->
# Oracle Database Instructions

**CRITICAL**: Use Oracle Database for enterprise relational data storage with advanced features, high availability, and comprehensive tooling.

## Core Features

### Connection
```typescript
// Using oracledb
import oracledb from 'oracledb'

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
oracledb.autoCommit = false

const connection = await oracledb.getConnection({
  user: process.env.DB_USER || 'system',
  password: process.env.DB_PASSWORD,
  connectString: `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '1521'}/${process.env.DB_SERVICE || 'XE'}`,
})

// Connection pool
const pool = await oracledb.createPool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE}`,
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 1,
  poolTimeout: 60,
})
```

### Basic Queries
```typescript
// SELECT
const result = await connection.execute(
  'SELECT * FROM Users WHERE Id = :id',
  { id: userId }
)
const users = result.rows

// INSERT with RETURNING
const result = await connection.execute(
  `INSERT INTO Users (Name, Email) 
   VALUES (:name, :email) 
   RETURNING Id INTO :id`,
  {
    name: 'John Doe',
    email: 'john@example.com',
    id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
  }
)
const newId = result.outBinds.id[0]

// UPDATE
const result = await connection.execute(
  'UPDATE Users SET Name = :name WHERE Id = :id',
  {
    name: 'Jane Doe',
    id: userId,
  }
)

// DELETE
await connection.execute(
  'DELETE FROM Users WHERE Id = :id',
  { id: userId }
)
```

### Transactions
```typescript
const connection = await pool.getConnection()

try {
  await connection.execute(
    'INSERT INTO Accounts (UserId, Balance) VALUES (:userId, :balance)',
    { userId, balance: 1000 }
  )
  
  await connection.execute(
    'INSERT INTO Transactions (AccountId, Amount) VALUES (:accountId, :amount)',
    { accountId, amount: 1000 }
  )
  
  await connection.commit()
} catch (error) {
  await connection.rollback()
  throw error
} finally {
  await connection.close()
}
```

### Advanced Features
```typescript
// PL/SQL procedures
const result = await connection.execute(
  `BEGIN
     sp_GetUserDetails(:userId, :userData);
   END;`,
  {
    userId,
    userData: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
  }
)

// JSON operations (Oracle 12c+)
const result = await connection.execute(
  `SELECT 
     Id,
     Name,
     JSON_VALUE(Metadata, '$.category') AS Category
   FROM Products
   WHERE JSON_VALUE(Metadata, '$.category') = :category`,
  { category: 'electronics' }
)

// Full-text search (Oracle Text)
const result = await connection.execute(
  `SELECT * FROM Articles
   WHERE CONTAINS(Content, :searchTerm, 1) > 0`,
  { searchTerm: 'search term' }
)

// Window functions
const result = await connection.execute(
  `SELECT 
     Name,
     Salary,
     ROW_NUMBER() OVER (PARTITION BY DepartmentId ORDER BY Salary DESC) AS Rank
   FROM Employees`
)
```

## Common Patterns

### Connection Pooling
```typescript
let pool: oracledb.Pool | null = null

export async function getPool(): Promise<oracledb.Pool> {
  if (!pool) {
    pool = await oracledb.createPool({
      // ... config
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
// Always use bind variables (:param) to prevent SQL injection
// ❌ WRONG
await connection.execute(`SELECT * FROM Users WHERE Email = '${email}'`)

// ✅ CORRECT
await connection.execute(
  'SELECT * FROM Users WHERE Email = :email',
  { email }
)
```

### Error Handling
```typescript
try {
  const result = await connection.execute(
    'SELECT * FROM Users WHERE Id = :id',
    { id: userId }
  )
  
  if (result.rows.length === 0) {
    throw new Error('User not found')
  }
  return result.rows[0]
} catch (error: any) {
  if (error.errorNum === 1) { // Unique constraint violation
    throw new Error('Duplicate entry')
  }
  if (error.errorNum === 2291) { // Foreign key constraint violation
    throw new Error('Referenced record does not exist')
  }
  throw error
}
```

## Best Practices

✅ **DO:**
- Use connection pooling (2-10 connections typically)
- Always use bind variables (:param)
- Use transactions for multi-step operations
- Create indexes on frequently queried columns
- Use appropriate data types
- Enable connection retry logic
- Use PL/SQL for complex operations
- Monitor connection pool usage
- Use appropriate fetch array sizes
- Implement proper error handling

❌ **DON'T:**
- Use string concatenation for queries (SQL injection risk)
- Create too many connections
- Skip error handling
- Ignore connection pool limits
- Use SELECT * in production
- Skip indexes on foreign keys
- Hardcode connection strings
- Skip transaction management
- Ignore query performance
- Use synchronous operations

## Configuration

### Environment Variables
```bash
DB_HOST=localhost
DB_PORT=1521
DB_SERVICE=XE
DB_USER=system
DB_PASSWORD=securepassword
```

### Docker Compose
```yaml
services:
  oracle:
    image: container-registry.oracle.com/database/express:21.3.0-xe
    ports:
      - "1521:1521"
      - "5500:5500"  # Enterprise Manager
    environment:
      ORACLE_PWD: securepassword
    volumes:
      - oracle_data:/opt/oracle/oradata
    healthcheck:
      test: ["CMD-SHELL", "sqlplus -S system/securepassword@localhost:1521/XE <<< 'SELECT 1 FROM DUAL;' || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  oracle_data:
```

## Integration with Development

### Testing
```typescript
// Use test database
const testPool = await oracledb.createPool({
  connectString: 'localhost:1521/TEST',
  // ... config
})

// Clean up after tests
afterEach(async () => {
  const connection = await testPool.getConnection()
  await connection.execute('DELETE FROM Users')
  await connection.execute('DELETE FROM Posts')
  await connection.close()
})
```

### Health Checks
```typescript
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const connection = await pool.getConnection()
    const result = await connection.execute('SELECT 1 FROM DUAL')
    await connection.close()
    return result.rows.length > 0
  } catch {
    return false
  }
}
```

<!-- ORACLE:END -->

