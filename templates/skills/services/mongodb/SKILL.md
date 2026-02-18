---
name: "MongoDB"
description: "Use MongoDB for document-based NoSQL storage with flexible schemas, horizontal scaling, and rich querying."
version: "1.0.0"
category: "services"
author: "Rulebook"
tags: ["services", "database"]
dependencies: []
conflicts: []
---
<!-- MONGODB:START -->
# MongoDB Database Instructions

**CRITICAL**: Use MongoDB for document-based NoSQL storage with flexible schemas, horizontal scaling, and rich querying.

## Core Features

### Connection
```typescript
// Using mongodb driver
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017', {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
})

await client.connect()
const db = client.db(process.env.DB_NAME || 'myapp')

// Using Mongoose
import mongoose from 'mongoose'

await mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  bufferCommands: false,
  bufferMaxEntries: 0,
})
```

### Basic Operations
```typescript
// Insert
const result = await db.collection('users').insertOne({
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: new Date(),
})

// Insert many
await db.collection('users').insertMany([
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
])

// Find
const user = await db.collection('users').findOne({ email: 'john@example.com' })
const users = await db.collection('users').find({ active: true }).toArray()

// Update
await db.collection('users').updateOne(
  { email: 'john@example.com' },
  { $set: { name: 'Jane Doe', updatedAt: new Date() } }
)

// Update many
await db.collection('users').updateMany(
  { active: false },
  { $set: { status: 'inactive' } }
)

// Delete
await db.collection('users').deleteOne({ email: 'john@example.com' })
await db.collection('users').deleteMany({ active: false })
```

### Advanced Queries
```typescript
// Aggregation pipeline
const result = await db.collection('orders').aggregate([
  { $match: { status: 'completed' } },
  { $group: { _id: '$userId', total: { $sum: '$amount' } } },
  { $sort: { total: -1 } },
  { $limit: 10 },
]).toArray()

// Text search
await db.collection('articles').createIndex({ title: 'text', content: 'text' })
const results = await db.collection('articles').find({
  $text: { $search: 'search term' },
}).toArray()

// Geospatial queries
await db.collection('locations').createIndex({ location: '2dsphere' })
const nearby = await db.collection('locations').find({
  location: {
    $near: {
      $geometry: { type: 'Point', coordinates: [longitude, latitude] },
      $maxDistance: 1000, // meters
    },
  },
}).toArray()

// Array operations
await db.collection('users').find({
  tags: { $in: ['javascript', 'typescript'] },
})
await db.collection('users').updateOne(
  { email: 'john@example.com' },
  { $push: { tags: 'new-tag' } }
)
```

## Common Patterns

### Mongoose Schemas
```typescript
import mongoose, { Schema } from 'mongoose'

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  age: { type: Number, min: 0, max: 120 },
  tags: [String],
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

userSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

const User = mongoose.model('User', userSchema)
```

### Transactions
```typescript
const session = client.startSession()
try {
  await session.withTransaction(async () => {
    await db.collection('accounts').updateOne(
      { userId: userId },
      { $inc: { balance: -100 } },
      { session }
    )
    
    await db.collection('transactions').insertOne(
      { userId, amount: -100, type: 'debit' },
      { session }
    )
  })
} finally {
  await session.endSession()
}
```

### Indexing
```typescript
// Create indexes
await db.collection('users').createIndex({ email: 1 }, { unique: true })
await db.collection('users').createIndex({ name: 1, email: 1 })
await db.collection('users').createIndex({ createdAt: -1 })

// Compound index
await db.collection('posts').createIndex({ authorId: 1, createdAt: -1 })

// TTL index (auto-delete after time)
await db.collection('sessions').createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 3600 }
)
```

## Best Practices

✅ **DO:**
- Use connection pooling (10-20 connections)
- Create indexes on frequently queried fields
- Use transactions for multi-document operations
- Use $set for updates (don't replace entire documents)
- Use projection to limit returned fields
- Use aggregation pipeline for complex queries
- Enable replica sets for production
- Use sharding for large datasets
- Monitor slow queries
- Use appropriate data types (ObjectId, Date, etc.)

❌ **DON'T:**
- Store large binary data (use GridFS)
- Create too many indexes (affects write performance)
- Use $where (slow, use aggregation instead)
- Skip error handling
- Hardcode connection strings
- Ignore connection pool limits
- Use nested arrays deeply (limit to 2-3 levels)
- Skip validation
- Ignore query performance
- Store sensitive data without encryption

## Configuration

### Environment Variables
```bash
MONGODB_URI=mongodb://localhost:27017/myapp
MONGODB_URI=mongodb://user:password@host:27017/database?authSource=admin
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database
```

### Docker Compose
```yaml
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: securepassword
      MONGO_INITDB_DATABASE: myapp
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mongodb_data:
```

## Integration with Development

### Testing
```typescript
// Use test database
const testClient = new MongoClient('mongodb://localhost:27017/test_db')
await testClient.connect()
const testDb = testClient.db('test_db')

// Clean up after tests
afterEach(async () => {
  await testDb.collection('users').deleteMany({})
  await testDb.collection('posts').deleteMany({})
})

// Use transactions for test isolation
beforeEach(async () => {
  const session = testClient.startSession()
  session.startTransaction()
  // Store session for rollback
})

afterEach(async () => {
  await session.abortTransaction()
  await session.endSession()
})
```

### Health Checks
```typescript
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await client.db('admin').command({ ping: 1 })
    return true
  } catch {
    return false
  }
}
```

<!-- MONGODB:END -->

