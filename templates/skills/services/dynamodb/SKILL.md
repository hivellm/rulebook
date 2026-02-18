---
name: "DynamoDB"
description: "Use DynamoDB for serverless NoSQL database with automatic scaling, high performance, and pay-per-use pricing."
version: "1.0.0"
category: "services"
author: "Rulebook"
tags: ["services", "database"]
dependencies: []
conflicts: []
---
<!-- DYNAMODB:START -->
# AWS DynamoDB Instructions

**CRITICAL**: Use DynamoDB for serverless NoSQL database with automatic scaling, high performance, and pay-per-use pricing.

## Core Features

### Connection
```typescript
// Using @aws-sdk/client-dynamodb
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

const docClient = DynamoDBDocumentClient.from(client)

// Using AWS SDK v2
import AWS from 'aws-sdk'

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
})
```

### Basic Operations
```typescript
// Put item
await docClient.send(new PutCommand({
  TableName: 'Users',
  Item: {
    id: 'user-1',
    email: 'john@example.com',
    name: 'John Doe',
    createdAt: new Date().toISOString(),
  },
}))

// Get item
const result = await docClient.send(new GetCommand({
  TableName: 'Users',
  Key: {
    id: 'user-1',
  },
}))
const user = result.Item

// Update item
await docClient.send(new UpdateCommand({
  TableName: 'Users',
  Key: { id: 'user-1' },
  UpdateExpression: 'SET #name = :name, updatedAt = :updatedAt',
  ExpressionAttributeNames: {
    '#name': 'name',
  },
  ExpressionAttributeValues: {
    ':name': 'Jane Doe',
    ':updatedAt': new Date().toISOString(),
  },
}))

// Delete item
await docClient.send(new DeleteCommand({
  TableName: 'Users',
  Key: { id: 'user-1' },
}))
```

### Query Operations
```typescript
// Query by partition key
const result = await docClient.send(new QueryCommand({
  TableName: 'Posts',
  KeyConditionExpression: 'userId = :userId',
  ExpressionAttributeValues: {
    ':userId': 'user-1',
  },
  ScanIndexForward: false, // Sort descending
  Limit: 10,
}))

// Query with GSI (Global Secondary Index)
const result = await docClient.send(new QueryCommand({
  TableName: 'Users',
  IndexName: 'EmailIndex',
  KeyConditionExpression: 'email = :email',
  ExpressionAttributeValues: {
    ':email': 'john@example.com',
  },
}))

// Scan (use sparingly)
const result = await docClient.send(new ScanCommand({
  TableName: 'Users',
  FilterExpression: '#status = :status',
  ExpressionAttributeNames: {
    '#status': 'status',
  },
  ExpressionAttributeValues: {
    ':status': 'active',
  },
  Limit: 100,
}))
```

### Advanced Features
```typescript
// Batch operations
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb'

await docClient.send(new BatchWriteCommand({
  RequestItems: {
    Users: [
      {
        PutRequest: {
          Item: { id: 'user-1', name: 'User 1' },
        },
      },
      {
        PutRequest: {
          Item: { id: 'user-2', name: 'User 2' },
        },
      },
    ],
  },
}))

// Transactions
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb'

await docClient.send(new TransactWriteCommand({
  TransactItems: [
    {
      Put: {
        TableName: 'Accounts',
        Item: { userId: 'user-1', balance: 1000 },
      },
    },
    {
      Put: {
        TableName: 'Transactions',
        Item: { id: 'tx-1', userId: 'user-1', amount: 1000 },
      },
    },
  ],
}))

// Conditional writes
await docClient.send(new PutCommand({
  TableName: 'Users',
  Item: { id: 'user-1', email: 'john@example.com' },
  ConditionExpression: 'attribute_not_exists(id)',
}))
```

## Common Patterns

### Single Table Design
```typescript
// Store different entity types in one table
await docClient.send(new PutCommand({
  TableName: 'AppData',
  Item: {
    PK: 'USER#user-1',
    SK: 'METADATA',
    EntityType: 'User',
    email: 'john@example.com',
    name: 'John Doe',
  },
}))

await docClient.send(new PutCommand({
  TableName: 'AppData',
  Item: {
    PK: 'USER#user-1',
    SK: 'POST#post-1',
    EntityType: 'Post',
    title: 'My Post',
    content: 'Content here',
  },
}))

// Query all posts for a user
const result = await docClient.send(new QueryCommand({
  TableName: 'AppData',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': 'USER#user-1',
    ':sk': 'POST#',
  },
}))
```

### Time-to-Live (TTL)
```typescript
// Items automatically deleted after TTL
await docClient.send(new PutCommand({
  TableName: 'Sessions',
  Item: {
    sessionId: 'session-1',
    userId: 'user-1',
    ttl: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  },
}))
```

## Best Practices

✅ **DO:**
- Design for access patterns
- Use appropriate partition keys
- Create GSIs for alternative access patterns
- Use batch operations when possible
- Implement exponential backoff for throttling
- Use TTL for temporary data
- Monitor provisioned capacity
- Use transactions for atomic operations
- Implement proper error handling
- Use single table design when appropriate

❌ **DON'T:**
- Use Scan for frequent queries
- Create too many GSIs (affects write performance)
- Store large items (> 400KB)
- Ignore throttling errors
- Hardcode table names
- Skip error handling
- Use eventually consistent reads when strong consistency needed
- Ignore capacity planning
- Store sensitive data without encryption
- Skip monitoring

## Configuration

### Environment Variables
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
DYNAMODB_TABLE_PREFIX=myapp_
```

### IAM Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/myapp-*"
    }
  ]
}
```

## Integration with Development

### Testing
```typescript
// Use DynamoDB Local
const localClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'local',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
})

// Clean up after tests
afterEach(async () => {
  // Delete test items or use separate test table
})
```

### Health Checks
```typescript
async function checkDynamoDBHealth(): Promise<boolean> {
  try {
    await docClient.send(new GetCommand({
      TableName: 'HealthCheck',
      Key: { id: 'health' },
    }))
    return true
  } catch {
    return false
  }
}
```

<!-- DYNAMODB:END -->

