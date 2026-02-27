<!-- KAFKA:START -->
# Apache Kafka Message Streaming Instructions

**CRITICAL**: Use Kafka for high-throughput event streaming, real-time data pipelines, and distributed messaging with fault tolerance.

## Core Features

### Connection
```typescript
// Using kafkajs
import { Kafka } from 'kafkajs'

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  ssl: process.env.KAFKA_SSL === 'true',
  sasl: process.env.KAFKA_USERNAME ? {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  } : undefined,
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
})

const producer = kafka.producer()
const consumer = kafka.consumer({ groupId: 'my-group' })
```

### Producing Messages
```typescript
await producer.connect()

// Send single message
await producer.send({
  topic: 'users',
  messages: [{
    key: 'user-1',
    value: JSON.stringify({ id: '1', name: 'John', email: 'john@example.com' }),
    headers: {
      'content-type': 'application/json',
    },
  }],
})

// Send multiple messages
await producer.send({
  topic: 'events',
  messages: [
    { key: 'event-1', value: JSON.stringify({ type: 'created', id: '1' }) },
    { key: 'event-2', value: JSON.stringify({ type: 'updated', id: '2' }) },
  ],
})

// Send with partition
await producer.send({
  topic: 'orders',
  messages: [{
    key: 'order-1',
    value: JSON.stringify({ orderId: '1', amount: 100 }),
    partition: 0, // Specific partition
  }],
})

await producer.disconnect()
```

### Consuming Messages
```typescript
await consumer.connect()
await consumer.subscribe({ topic: 'users', fromBeginning: false })

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const key = message.key?.toString()
    const value = JSON.parse(message.value?.toString() || '{}')
    
    console.log({
      topic,
      partition,
      offset: message.offset,
      key,
      value,
      headers: message.headers,
    })
    
    // Process message
    await processMessage(value)
  },
})

// Consume from specific partition
await consumer.subscribe({ topic: 'events' })
await consumer.run({
  partitionsConsumedConcurrently: 1, // Process one partition at a time
  eachMessage: async ({ topic, partition, message }) => {
    // Process message
  },
})
```

### Advanced Features
```typescript
// Transactional producer
const transactionalProducer = kafka.producer({
  transactionalId: 'my-transactional-producer',
  maxInFlightRequests: 1,
  idempotent: true,
})

await transactionalProducer.connect()

await transactionalProducer.send({
  topic: 'users',
  messages: [{ key: 'user-1', value: JSON.stringify(userData) }],
})

await transactionalProducer.sendOffsets({
  consumerGroupId: 'my-group',
  topics: [{
    topic: 'users',
    partitions: [{ partition: 0, offset: '100' }],
  }],
})

await transactionalProducer.commitTransaction()

// Admin operations
const admin = kafka.admin()
await admin.connect()

// Create topic
await admin.createTopics({
  topics: [{
    topic: 'new-topic',
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '604800000' }, // 7 days
    ],
  }],
})

// List topics
const topics = await admin.listTopics()

// Delete topic
await admin.deleteTopics({
  topics: ['old-topic'],
})

await admin.disconnect()
```

## Common Patterns

### Event Sourcing
```typescript
async function publishEvent(eventType: string, aggregateId: string, data: any) {
  await producer.send({
    topic: 'events',
    messages: [{
      key: aggregateId,
      value: JSON.stringify({
        eventType,
        aggregateId,
        data,
        timestamp: new Date().toISOString(),
        version: 1,
      }),
      headers: {
        'event-type': eventType,
      },
    }],
  })
}

// Replay events
await consumer.subscribe({ topic: 'events', fromBeginning: true })
```

### CQRS Pattern
```typescript
// Command side (write)
async function handleCommand(command: any) {
  // Process command
  const result = await processCommand(command)
  
  // Publish event
  await producer.send({
    topic: 'commands',
    messages: [{
      key: command.aggregateId,
      value: JSON.stringify({
        commandType: command.type,
        aggregateId: command.aggregateId,
        data: result,
      }),
    }],
  })
}

// Query side (read)
await consumer.subscribe({ topic: 'commands' })
await consumer.run({
  eachMessage: async ({ message }) => {
    const command = JSON.parse(message.value?.toString() || '{}')
    await updateReadModel(command)
  },
})
```

### Stream Processing
```typescript
// Process stream with state
const stateStore = new Map<string, any>()

await consumer.subscribe({ topic: 'events' })
await consumer.run({
  eachMessage: async ({ message }) => {
    const event = JSON.parse(message.value?.toString() || '{}')
    const key = event.aggregateId
    
    // Update state
    const currentState = stateStore.get(key) || {}
    const newState = { ...currentState, ...event.data }
    stateStore.set(key, newState)
    
    // Emit aggregated result
    await producer.send({
      topic: 'aggregated-events',
      messages: [{
        key,
        value: JSON.stringify(newState),
      }],
    })
  },
})
```

## Best Practices

✅ **DO:**
- Use appropriate partition keys for message ordering
- Implement idempotent consumers
- Use consumer groups for load balancing
- Monitor consumer lag
- Use transactions for exactly-once semantics
- Set appropriate retention policies
- Use compression for large messages
- Implement proper error handling
- Use schema registry for message validation
- Monitor topic sizes and partitions

❌ **DON'T:**
- Store large messages (> 1MB, use external storage)
- Skip error handling
- Ignore consumer lag
- Hardcode broker addresses
- Use too many partitions (affects performance)
- Skip idempotency checks
- Ignore message ordering requirements
- Store sensitive data without encryption
- Skip monitoring
- Use synchronous operations

## Configuration

### Environment Variables
```bash
KAFKA_BROKERS=localhost:9092
KAFKA_BROKERS=broker1:9092,broker2:9092,broker3:9092
KAFKA_SSL=false
KAFKA_USERNAME=
KAFKA_PASSWORD=
```

### Docker Compose
```yaml
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    healthcheck:
      test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"]
      interval: 10s
      timeout: 5s
      retries: 5
```

## Integration with Development

### Testing
```typescript
// Use test Kafka instance
const testKafka = new Kafka({
  clientId: 'test-app',
  brokers: ['localhost:9093'], // Different port
})

// Clean up after tests
afterEach(async () => {
  // Delete test topics or use separate test cluster
})
```

### Health Checks
```typescript
async function checkKafkaHealth(): Promise<boolean> {
  try {
    const admin = kafka.admin()
    await admin.connect()
    await admin.listTopics()
    await admin.disconnect()
    return true
  } catch {
    return false
  }
}
```

<!-- KAFKA:END -->

