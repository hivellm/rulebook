---
name: "RabbitMQ"
description: "Use RabbitMQ for reliable message queuing, pub/sub messaging, and task distribution with multiple exchange types."
version: "1.0.0"
category: "services"
author: "Rulebook"
tags: ["services", "messaging"]
dependencies: []
conflicts: []
---
<!-- RABBITMQ:START -->
# RabbitMQ Message Queue Instructions

**CRITICAL**: Use RabbitMQ for reliable message queuing, pub/sub messaging, and task distribution with multiple exchange types.

## Core Features

### Connection
```typescript
// Using amqplib
import amqp from 'amqplib'

const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672')
const channel = await connection.createChannel()

// Connection with options
const connection = await amqp.connect({
  protocol: 'amqp',
  hostname: process.env.RABBITMQ_HOST || 'localhost',
  port: parseInt(process.env.RABBITMQ_PORT || '5672'),
  username: process.env.RABBITMQ_USER || 'guest',
  password: process.env.RABBITMQ_PASSWORD || 'guest',
  vhost: process.env.RABBITMQ_VHOST || '/',
})
```

### Basic Operations
```typescript
// Declare queue
await channel.assertQueue('tasks', {
  durable: true, // Survive broker restart
})

// Send message
channel.sendToQueue('tasks', Buffer.from(JSON.stringify({ task: 'process' })), {
  persistent: true, // Survive broker restart
})

// Consume messages
await channel.consume('tasks', (msg) => {
  if (msg) {
    const content = JSON.parse(msg.content.toString())
    console.log('Received:', content)
    
    // Process message
    processTask(content)
    
    // Acknowledge
    channel.ack(msg)
  }
}, {
  noAck: false, // Manual acknowledgment
})
```

### Exchange Types
```typescript
// Direct exchange
await channel.assertExchange('logs', 'direct', { durable: true })
await channel.bindQueue('queue', 'logs', 'error')
await channel.publish('logs', 'error', Buffer.from('Error message'))

// Topic exchange
await channel.assertExchange('events', 'topic', { durable: true })
await channel.bindQueue('queue', 'events', 'user.*.created')
await channel.publish('events', 'user.123.created', Buffer.from(JSON.stringify(data)))

// Fanout exchange (broadcast)
await channel.assertExchange('notifications', 'fanout', { durable: true })
await channel.bindQueue('queue1', 'notifications', '')
await channel.bindQueue('queue2', 'notifications', '')
await channel.publish('notifications', '', Buffer.from('Broadcast message'))

// Headers exchange
await channel.assertExchange('headers_exchange', 'headers', { durable: true })
await channel.bindQueue('queue', 'headers_exchange', '', {
  'x-match': 'all',
  type: 'notification',
  priority: 'high',
})
await channel.publish('headers_exchange', '', Buffer.from('Message'), {
  headers: { type: 'notification', priority: 'high' },
})
```

## Common Patterns

### Work Queue (Task Distribution)
```typescript
// Producer
async function publishTask(task: any) {
  await channel.assertQueue('tasks', { durable: true })
  channel.sendToQueue('tasks', Buffer.from(JSON.stringify(task)), {
    persistent: true,
  })
}

// Consumer
async function consumeTasks() {
  await channel.assertQueue('tasks', { durable: true })
  channel.prefetch(1) // Process one message at a time
  
  await channel.consume('tasks', async (msg) => {
    if (msg) {
      try {
        const task = JSON.parse(msg.content.toString())
        await processTask(task)
        channel.ack(msg)
      } catch (error) {
        // Reject and requeue
        channel.nack(msg, false, true)
      }
    }
  })
}
```

### Pub/Sub
```typescript
// Publisher
async function publishEvent(eventType: string, data: any) {
  await channel.assertExchange('events', 'topic', { durable: true })
  channel.publish('events', eventType, Buffer.from(JSON.stringify(data)), {
    persistent: true,
  })
}

// Subscriber
async function subscribeToEvents(routingKey: string, handler: (data: any) => void) {
  await channel.assertExchange('events', 'topic', { durable: true })
  const queue = await channel.assertQueue('', { exclusive: true })
  await channel.bindQueue(queue.queue, 'events', routingKey)
  
  await channel.consume(queue.queue, (msg) => {
    if (msg) {
      const data = JSON.parse(msg.content.toString())
      handler(data)
      channel.ack(msg)
    }
  })
}
```

### RPC Pattern
```typescript
// RPC Server
async function setupRPCServer() {
  await channel.assertQueue('rpc_queue', { durable: false })
  channel.prefetch(1)
  
  await channel.consume('rpc_queue', async (msg) => {
    if (msg) {
      const request = JSON.parse(msg.content.toString())
      const response = await processRequest(request)
      
      channel.sendToQueue(
        msg.properties.replyTo,
        Buffer.from(JSON.stringify(response)),
        {
          correlationId: msg.properties.correlationId,
        }
      )
      
      channel.ack(msg)
    }
  })
}

// RPC Client
async function rpcCall(request: any): Promise<any> {
  const queue = await channel.assertQueue('', { exclusive: true })
  const correlationId = generateUuid()
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      channel.deleteQueue(queue.queue)
      reject(new Error('RPC timeout'))
    }, 10000)
    
    channel.consume(queue.queue, (msg) => {
      if (msg && msg.properties.correlationId === correlationId) {
        clearTimeout(timeout)
        const response = JSON.parse(msg.content.toString())
        channel.deleteQueue(queue.queue)
        resolve(response)
      }
    }, { noAck: true })
    
    channel.sendToQueue('rpc_queue', Buffer.from(JSON.stringify(request)), {
      correlationId,
      replyTo: queue.queue,
    })
  })
}
```

## Best Practices

✅ **DO:**
- Use durable queues and exchanges for important messages
- Set message persistence for critical messages
- Use manual acknowledgment (noAck: false)
- Implement proper error handling
- Use prefetch to control message distribution
- Monitor queue lengths
- Use dead letter exchanges for failed messages
- Implement connection retry logic
- Use appropriate exchange types
- Set message TTL when needed

❌ **DON'T:**
- Skip acknowledgment (lose messages on crash)
- Use auto-ack for critical messages
- Ignore connection errors
- Hardcode connection strings
- Store large messages (use external storage)
- Skip error handling
- Ignore queue monitoring
- Use non-durable queues for important data
- Skip message persistence
- Ignore memory limits

## Configuration

### Environment Variables
```bash
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_URL=amqp://user:password@host:5672/vhost
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/
```

### Docker Compose
```yaml
services:
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"   # AMQP
      - "15672:15672" # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: securepassword
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  rabbitmq_data:
```

## Integration with Development

### Testing
```typescript
// Use test connection
const testConnection = await amqp.connect('amqp://localhost:5673') // Different port

// Clean up after tests
afterEach(async () => {
  // Delete test queues/exchanges or use separate vhost
})
```

### Health Checks
```typescript
async function checkRabbitMQHealth(): Promise<boolean> {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL)
    await connection.close()
    return true
  } catch {
    return false
  }
}
```

<!-- RABBITMQ:END -->

