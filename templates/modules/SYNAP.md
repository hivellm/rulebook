<!-- SYNAP:START -->
# Synap Instructions

**CRITICAL**: Use MCP Synap for persistent task and data storage across context windows.

## Core Features

### Key-Value Store
```
synap_kv_set(key, value, ttl?)   # Store with optional TTL
synap_kv_get(key)                 # Retrieve  
synap_kv_delete(key)              # Remove
synap_kv_scan(prefix)             # List by prefix
```

### Queue & Pub/Sub
```
synap_queue_publish(queue, message, priority)  # Add to queue
synap_queue_consume(queue)                     # Process from queue
synap_pubsub_publish(topic, message)           # Broadcast
synap_stream_publish(room, event)              # Stream events
```

## Common Patterns

### Task Tracking
```
Pattern: "task:<feature>:<subtask-id>"

synap_kv_set("task:auth:login", JSON.stringify({
  status: "in_progress",
  tests: ["test_login_success"],
  coverage: 95.2
}))
```

### Session State
```
Pattern: "session:<id>:<data-type>"

synap_kv_set("session:abc:current-file", "/src/auth.ts")
synap_kv_set("session:abc:todo-list", JSON.stringify([...]))
```

### Test Results
```
Pattern: "test:<suite>:<timestamp>"

synap_kv_set("test:integration:latest", JSON.stringify({
  passed: 42,
  failed: 0,
  coverage: 96.5
}), 86400) // TTL: 24 hours
```

## Best Practices

✅ **DO:**
- Use TTL for temporary data
- Use prefixes for organization
- Store session state before context switch
- Clean up old data regularly

❌ **DON'T:**
- Store large binary data
- Use random keys (use structured prefixes)
- Skip TTL for temporary data

<!-- SYNAP:END -->
