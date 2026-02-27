<!-- SQLITE:START -->
# SQLite Database Instructions

**CRITICAL**: Use SQLite for embedded databases, local storage, development, and small-scale applications with zero configuration.

## Core Features

### Connection
```typescript
// Using better-sqlite3 (synchronous, faster)
import Database from 'better-sqlite3'

const db = new Database(process.env.DB_PATH || './database.db', {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
})

// Using sqlite3 (asynchronous)
import sqlite3 from 'sqlite3'

const db = new sqlite3.Database(process.env.DB_PATH || './database.db', (err) => {
  if (err) {
    console.error('Error opening database', err)
  }
})

// Using better-sqlite3 with WAL mode (recommended)
const db = new Database('./database.db')
db.pragma('journal_mode = WAL') // Write-Ahead Logging
db.pragma('foreign_keys = ON')  // Enable foreign keys
```

### Basic Queries
```typescript
// Using better-sqlite3 (synchronous)
// SELECT
const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
const user = stmt.get(userId)

// INSERT
const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
const info = insert.run('John Doe', 'john@example.com')
const newId = info.lastInsertRowid

// UPDATE
const update = db.prepare('UPDATE users SET name = ? WHERE id = ?')
update.run('Jane Doe', userId)

// DELETE
const del = db.prepare('DELETE FROM users WHERE id = ?')
del.run(userId)

// Using sqlite3 (asynchronous)
db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
  if (err) throw err
  console.log(row)
})

db.run('INSERT INTO users (name, email) VALUES (?, ?)', ['John Doe', 'john@example.com'], function(err) {
  if (err) throw err
  console.log('Inserted with ID:', this.lastID)
})
```

### Transactions
```typescript
// Using better-sqlite3
const insertUser = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
const insertPost = db.prepare('INSERT INTO posts (user_id, title) VALUES (?, ?)')

const insertUserAndPost = db.transaction((userName, userEmail, postTitle) => {
  const userInfo = insertUser.run(userName, userEmail)
  const userId = userInfo.lastInsertRowid
  insertPost.run(userId, postTitle)
  return userId
})

const userId = insertUserAndPost('John Doe', 'john@example.com', 'First Post')

// Using sqlite3
db.serialize(() => {
  db.run('BEGIN TRANSACTION')
  db.run('INSERT INTO users (name, email) VALUES (?, ?)', ['John', 'john@example.com'], function(err) {
    if (err) {
      db.run('ROLLBACK')
      throw err
    }
    const userId = this.lastID
    db.run('INSERT INTO posts (user_id, title) VALUES (?, ?)', [userId, 'Post'], (err) => {
      if (err) {
        db.run('ROLLBACK')
        throw err
      }
      db.run('COMMIT')
    })
  })
})
```

### Advanced Features
```typescript
// JSON operations (SQLite 3.38+)
const result = db.prepare(`
  SELECT 
    id,
    name,
    json_extract(metadata, '$.category') AS category
  FROM products
  WHERE json_extract(metadata, '$.category') = ?
`).get('electronics')

// Full-text search (FTS5)
db.exec(`
  CREATE VIRTUAL TABLE articles_fts USING fts5(
    title,
    content,
    content_rowid=id
  )
`)

const results = db.prepare(`
  SELECT * FROM articles_fts
  WHERE articles_fts MATCH ?
`).all('search term')

// Window functions (SQLite 3.25+)
const result = db.prepare(`
  SELECT 
    name,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rank
  FROM employees
`).all()
```

## Common Patterns

### Prepared Statements
```typescript
// Reuse prepared statements for better performance
const getUserById = db.prepare('SELECT * FROM users WHERE id = ?')
const getUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?')

// Use in functions
function getUser(id: number) {
  return getUserById.get(id)
}

function findUserByEmail(email: string) {
  return getUserByEmail.get(email)
}
```

### Batch Operations
```typescript
// Insert multiple rows efficiently
const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
const insertMany = db.transaction((users) => {
  for (const user of users) {
    insert.run(user.name, user.email)
  }
})

insertMany([
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
])
```

### Migrations
```typescript
// Simple migration system
const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
]

db.exec('BEGIN TRANSACTION')
try {
  for (const migration of migrations) {
    db.exec(migration)
  }
  db.exec('COMMIT')
} catch (error) {
  db.exec('ROLLBACK')
  throw error
}
```

## Best Practices

✅ **DO:**
- Use WAL mode for better concurrency
- Enable foreign keys
- Use prepared statements
- Use transactions for multiple operations
- Create indexes on frequently queried columns
- Use appropriate data types (TEXT, INTEGER, REAL, BLOB)
- Backup database regularly
- Use connection pooling (better-sqlite3 handles this)
- Monitor database size
- Use VACUUM periodically

❌ **DON'T:**
- Use for high-concurrency write scenarios
- Store large binary data (use external storage)
- Skip error handling
- Use string concatenation for queries
- Ignore database size limits
- Skip indexes on foreign keys
- Hardcode database paths
- Ignore transaction boundaries
- Use synchronous operations in async contexts (better-sqlite3 is fine)
- Skip backups

## Configuration

### Environment Variables
```bash
DB_PATH=./database.db
DB_PATH=/var/lib/myapp/database.db
```

### Initialization
```typescript
// Initialize database with schema
const db = new Database('./database.db')

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.pragma('synchronous = NORMAL')
db.pragma('cache_size = 10000')
db.pragma('temp_store = MEMORY')

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
  
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
`)
```

## Integration with Development

### Testing
```typescript
// Use in-memory database for tests
const testDb = new Database(':memory:')

// Or use separate test database
const testDb = new Database('./test.db')

// Clean up after tests
afterEach(() => {
  testDb.exec('DELETE FROM users')
  testDb.exec('DELETE FROM posts')
})

afterAll(() => {
  testDb.close()
  // Optionally delete test database file
})
```

### Health Checks
```typescript
function checkDatabaseHealth(): boolean {
  try {
    db.prepare('SELECT 1').get()
    return true
  } catch {
    return false
  }
}
```

<!-- SQLITE:END -->

