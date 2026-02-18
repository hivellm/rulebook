# MCP Server API Documentation

## Overview

The Rulebook MCP Server provides programmatic access to task management functions through the Model Context Protocol (MCP). This allows AI models and other MCP-compatible clients to manage Rulebook tasks without executing terminal commands.

## Server Information

- **Name**: `rulebook-task-management`
- **Version**: `1.0.2`
- **Transport**: stdio (standard input/output)
- **Protocol**: MCP (Model Context Protocol)

## Available Functions

### `rulebook_task_create`

Create a new Rulebook task with OpenSpec-compatible format.

**Input Schema:**
```typescript
{
  taskId: string;                    // Task ID in kebab-case (e.g., add-feature-name)
  proposal?: {                        // Optional proposal content
    why: string;                      // Why this change is needed (minimum 20 characters)
    whatChanges: string;              // Description of what will change
    impact?: {                        // Optional impact analysis
      affectedSpecs?: string[];       // List of affected specifications
      affectedCode?: string[];        // List of affected code files/modules
      breakingChange: boolean;        // Whether this is a breaking change
      userBenefit: string;           // User benefit description
    };
  };
}
```

**Output Schema:**
```typescript
{
  success: boolean;                   // Whether task creation succeeded
  taskId: string;                    // Created task ID
  message: string;                    // Success or error message
  path?: string;                      // Path to created task directory
}
```

**Example:**
```json
{
  "taskId": "add-user-authentication",
  "proposal": {
    "why": "Users need secure authentication to access protected resources",
    "whatChanges": "Add JWT-based authentication system with login and registration endpoints",
    "impact": {
      "affectedSpecs": ["auth/spec.md"],
      "affectedCode": ["src/auth/", "src/middleware/"],
      "breakingChange": false,
      "userBenefit": "Secure user authentication and session management"
    }
  }
}
```

---

### `rulebook_task_list`

List all Rulebook tasks with optional filters.

**Input Schema:**
```typescript
{
  includeArchived?: boolean;         // Include archived tasks (default: false)
  status?: 'pending' | 'in-progress' | 'completed' | 'blocked';  // Filter by status
}
```

**Output Schema:**
```typescript
{
  tasks: Array<{
    id: string;                       // Task ID
    title: string;                    // Task title
    status: 'pending' | 'in-progress' | 'completed' | 'blocked';
    createdAt: string;                // ISO 8601 timestamp
    updatedAt: string;                // ISO 8601 timestamp
    archivedAt?: string;              // ISO 8601 timestamp (if archived)
  }>;
  count: number;                      // Total number of tasks
}
```

**Example:**
```json
{
  "includeArchived": false,
  "status": "in-progress"
}
```

**Response:**
```json
{
  "tasks": [
    {
      "id": "add-user-authentication",
      "title": "add-user-authentication",
      "status": "in-progress",
      "createdAt": "2025-11-24T01:52:17.877Z",
      "updatedAt": "2025-11-24T02:15:30.123Z"
    }
  ],
  "count": 1
}
```

---

### `rulebook_task_show`

Show detailed information about a specific task.

**Input Schema:**
```typescript
{
  taskId: string;                     // Task ID to show
}
```

**Output Schema:**
```typescript
{
  task: {
    id: string;
    title: string;
    status: 'pending' | 'in-progress' | 'completed' | 'blocked';
    proposal?: string;                 // Proposal markdown content
    tasks?: string;                    // Tasks checklist markdown content
    design?: string;                   // Design document markdown content
    specs?: Record<string, string>;    // Module -> spec content mapping
    createdAt: string;
    updatedAt: string;
    archivedAt?: string;
  } | null;
  found: boolean;                     // Whether task was found
}
```

**Example:**
```json
{
  "taskId": "add-user-authentication"
}
```

---

### `rulebook_task_update`

Update task status or progress.

**Input Schema:**
```typescript
{
  taskId: string;                     // Task ID to update
  status?: 'pending' | 'in-progress' | 'completed' | 'blocked';  // New status
  progress?: number;                  // Progress percentage (0-100)
}
```

**Output Schema:**
```typescript
{
  success: boolean;                   // Whether update succeeded
  taskId: string;                    // Updated task ID
  message: string;                    // Success or error message
}
```

**Example:**
```json
{
  "taskId": "add-user-authentication",
  "status": "in-progress",
  "progress": 50
}
```

---

### `rulebook_task_validate`

Validate task format against OpenSpec-compatible requirements.

**Input Schema:**
```typescript
{
  taskId: string;                     // Task ID to validate
}
```

**Output Schema:**
```typescript
{
  valid: boolean;                     // Whether task format is valid
  errors: string[];                   // List of validation errors
  warnings: string[];                 // List of validation warnings
}
```

**Example:**
```json
{
  "taskId": "add-user-authentication"
}
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

---

### `rulebook_task_archive`

Archive a completed task and apply spec deltas.

**Input Schema:**
```typescript
{
  taskId: string;                     // Task ID to archive
  skipValidation?: boolean;           // Skip validation before archiving (default: false)
}
```

**Output Schema:**
```typescript
{
  success: boolean;                   // Whether archiving succeeded
  taskId: string;                    // Archived task ID
  archivePath: string;                // Path to archive location
  message: string;                    // Success or error message
}
```

**Example:**
```json
{
  "taskId": "add-user-authentication",
  "skipValidation": false
}
```

---

## Error Handling

All MCP functions return structured error responses:

```typescript
{
  success: false,
  message: "Error description",
  // ... other fields may be present
}
```

Common error scenarios:
- **Task not found**: When querying a non-existent task
- **Task already exists**: When creating a duplicate task
- **Validation errors**: When archiving a task with invalid format
- **File system errors**: When unable to read/write task files

## Usage Examples

### Creating a Task via MCP

```typescript
// Using MCP client
const result = await mcpClient.callTool('rulebook_task_create', {
  taskId: 'add-feature-x',
  proposal: {
    why: 'Users need feature X to improve productivity',
    whatChanges: 'Add feature X with Y and Z capabilities',
    impact: {
      affectedSpecs: ['features/spec.md'],
      affectedCode: ['src/features/'],
      breakingChange: false,
      userBenefit: 'Improved productivity and user experience'
    }
  }
});

console.log(result.structuredContent);
// {
//   success: true,
//   taskId: 'add-feature-x',
//   message: 'Task add-feature-x created successfully',
//   path: 'rulebook/tasks/add-feature-x'
// }
```

### Listing Tasks with Filters

```typescript
// List only in-progress tasks
const result = await mcpClient.callTool('rulebook_task_list', {
  status: 'in-progress',
  includeArchived: false
});

console.log(result.structuredContent.tasks);
// Array of task objects with status 'in-progress'
```

### Updating Task Status

```typescript
// Mark task as completed
const result = await mcpClient.callTool('rulebook_task_update', {
  taskId: 'add-feature-x',
  status: 'completed'
});

console.log(result.structuredContent);
// {
//   success: true,
//   taskId: 'add-feature-x',
//   message: 'Task add-feature-x updated successfully'
// }
```

## Integration with Cursor

The MCP server is configured in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "rulebook": {
      "command": "node",
      "args": ["dist/mcp/rulebook-server.js"],
      "env": {}
    }
  }
}
```

After configuration, restart Cursor to load the MCP server. The tools will be available in the Cursor MCP panel.

## Troubleshooting

### Server Not Starting

**Problem**: MCP server fails to start

**Solutions**:
1. Verify Node.js version: `node --version` (requires Node.js 20+)
2. Check if `dist/mcp/rulebook-server.js` exists: Run `npm run build`
3. Verify MCP configuration in `.cursor/mcp.json`
4. Check Cursor logs for error messages

### Tools Not Appearing

**Problem**: Tools don't appear in Cursor MCP panel

**Solutions**:
1. Restart Cursor completely
2. Verify MCP server is running: Check Cursor MCP status panel
3. Check server logs for registration errors
4. Verify Zod version compatibility: `npm list zod` (should be 3.25.76)

### Schema Conversion Errors

**Problem**: `keyValidator._parse is not a function` error

**Solutions**:
1. Ensure Zod v3 is installed: `npm install zod@3.25.76`
2. Rebuild project: `npm run build`
3. Restart MCP server

### Task Operations Failing

**Problem**: Task operations return errors

**Solutions**:
1. Verify task exists: Use `rulebook_task_list` to check
2. Check file permissions: Ensure write access to `rulebook/tasks/` directory
3. Verify task format: Use `rulebook_task_validate` to check format
4. Check error messages in response for specific issues

## Best Practices

1. **Always validate before archiving**: Use `rulebook_task_validate` before archiving tasks
2. **Handle errors gracefully**: Check `success` field in responses
3. **Use structured content**: Prefer `structuredContent` over parsing text content
4. **Filter tasks efficiently**: Use status filters to reduce response size
5. **Update status incrementally**: Update task status as work progresses

## Version Compatibility

- **MCP SDK**: `@modelcontextprotocol/sdk@^1.22.0`
- **Zod**: `zod@3.25.76` (required for compatibility)
- **Node.js**: `>=20.0.0`

## Support

For issues or questions:
- Check [README.md](../README.md) for general information
- Review [RULEBOOK.md](../rulebook/specs/RULEBOOK.md) for task management details
- Open an issue on GitHub: https://github.com/hivellm/rulebook/issues

