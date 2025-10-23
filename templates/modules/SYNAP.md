<!-- SYNAP:START -->
# Synap Instructions

**CRITICAL**: Use MCP Synap for persistent task and data storage during development sessions.

Synap provides a distributed key-value store, pub/sub messaging, and streaming capabilities. Use it to maintain state, track tasks, and persist important data across context windows.

## Core Features

### 1. Key-Value Store

Store and retrieve data with TTL support:

- `synap_kv_get`: Retrieve a value by key
- `synap_kv_set`: Store a value with optional TTL (time-to-live)
- `synap_kv_delete`: Remove a key from storage
- `synap_kv_scan`: Scan keys by prefix pattern

**Usage**:
```
Use for: Task tracking, configuration storage, session state
TTL for: Temporary data that should expire
Scan for: Listing related items by prefix (e.g., "task:*")
```

### 2. Queue System

Persistent message queues for task management:

- `synap_queue_publish`: Add a message to a queue with priority
- `synap_queue_consume`: Retrieve and process messages from queue

**Usage**:
```
Use for: Task queues, work distribution, async job processing
Priorities: 0-9 (9 = highest priority)
Pattern: Producer-consumer model for parallel work
```

### 3. Pub/Sub Messaging

Event-driven communication:

- `synap_pubsub_publish`: Broadcast message to topic subscribers

**Usage**:
```
Use for: Event notifications, real-time updates, broadcast messages
Pattern: One-to-many messaging for loosely coupled components
```

### 4. Streaming

Real-time event streaming:

- `synap_stream_publish`: Publish events to a stream room

**Usage**:
```
Use for: Real-time data streams, live updates, event logs
Pattern: Continuous data flow for monitoring and analytics
```

## Best Practices for AI Development

### Task Tracking

Store implementation tasks and progress:

```
Pattern: "task:<feature-name>:<subtask-id>"

Example:
- synap_kv_set("task:auth:implement-login", JSON.stringify({
    status: "in_progress",
    started: "2024-01-01T10:00:00Z",
    tests: ["test_login_success", "test_login_failure"],
    coverage: 95.2
  }))
```

### Session State

Preserve state across context windows:

```
Pattern: "session:<session-id>:<data-type>"

Example:
- synap_kv_set("session:abc123:current-file", "/src/auth/login.ts")
- synap_kv_set("session:abc123:todo-list", JSON.stringify([...]))
```

### Configuration Storage

Store project configuration and settings:

```
Pattern: "config:<category>:<key>"

Example:
- synap_kv_set("config:project:coverage-threshold", "95")
- synap_kv_set("config:project:languages", JSON.stringify(["rust", "typescript"]))
```

### Test Results

Track test execution and coverage:

```
Pattern: "test:<suite>:<timestamp>"

Example:
- synap_kv_set("test:integration:latest", JSON.stringify({
    passed: 42,
    failed: 0,
    coverage: 96.5,
    duration: "3.2s"
  }), 86400) // TTL: 24 hours
```

## Common Patterns

### Pattern 1: Multi-Step Implementation Tracking

```
1. Store overall plan: synap_kv_set("plan:feature-x", plan_json)
2. Track each step: synap_kv_set("step:feature-x:1", step_status)
3. Update progress: synap_kv_set("progress:feature-x", percentage)
4. Mark complete: synap_kv_delete("plan:feature-x")
```

### Pattern 2: Code Generation History

```
1. Store generated code: synap_kv_set("generated:file-path", code)
2. Track modifications: synap_kv_set("history:file-path", changelog)
3. List all generated: synap_kv_scan("generated:*")
```

### Pattern 3: Error Tracking

```
1. Log errors: synap_kv_set("error:timestamp", error_details, 3600)
2. Track fixes: synap_kv_set("fix:error-id", fix_details)
3. Scan recent errors: synap_kv_scan("error:*")
```

## Retention and Cleanup

- Use TTL for temporary data (session state, cache, recent errors)
- No TTL for persistent data (configuration, important results)
- Regularly clean up old data with `synap_kv_delete`
- Use prefixes for easy bulk operations with `synap_kv_scan`

## Integration with Development Workflow

1. **Before Starting**: Check for existing state (`synap_kv_get("session:current-task")`)
2. **During Work**: Update progress regularly (`synap_kv_set("progress:*")`)
3. **After Completion**: Store results and clean up temporary data
4. **Context Switch**: Save complete state before summarization

<!-- SYNAP:END -->

