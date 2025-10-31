<!-- NOTION:START -->
# Notion MCP Instructions

**CRITICAL**: Use MCP Notion for documentation, task tracking, and knowledge management.

## Core Operations

### Database Queries
```typescript
// Query database
notion.databases.query({
  database_id: 'database-id',
  filter: {
    property: 'Status',
    select: { equals: 'In Progress' }
  },
  sorts: [{ property: 'Created', direction: 'descending' }]
})

// Get database
notion.databases.retrieve({ database_id: 'database-id' })
```

### Page Operations
```typescript
// Create page
notion.pages.create({
  parent: { database_id: 'database-id' },
  properties: {
    'Name': { title: [{ text: { content: 'New Task' } }] },
    'Status': { select: { name: 'To Do' } },
    'Priority': { select: { name: 'High' } }
  }
})

// Update page
notion.pages.update({
  page_id: 'page-id',
  properties: {
    'Status': { select: { name: 'Done' } }
  }
})

// Get page
notion.pages.retrieve({ page_id: 'page-id' })
```

### Block Operations
```typescript
// Get blocks
notion.blocks.children.list({ block_id: 'page-id' })

// Append blocks
notion.blocks.children.append({
  block_id: 'page-id',
  children: [
    {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Section Title' } }]
      }
    },
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: 'Content here' } }]
      }
    }
  ]
})
```

### Search
```typescript
// Search all content
notion.search({
  query: 'search term',
  filter: { property: 'object', value: 'page' },
  sort: { direction: 'descending', timestamp: 'last_edited_time' }
})
```

## Common Patterns

### Task Management
```typescript
// Create task
await notion.pages.create({
  parent: { database_id: tasksDbId },
  properties: {
    'Task': { title: [{ text: { content: 'Implement feature X' } }] },
    'Status': { select: { name: 'To Do' } },
    'Assignee': { people: [{ id: userId }] },
    'Due Date': { date: { start: '2024-12-31' } }
  }
})

// Update task status
await notion.pages.update({
  page_id: taskId,
  properties: {
    'Status': { select: { name: 'In Progress' } },
    'Started': { date: { start: new Date().toISOString() } }
  }
})

// Complete task
await notion.pages.update({
  page_id: taskId,
  properties: {
    'Status': { select: { name: 'Done' } },
    'Completed': { date: { start: new Date().toISOString() } }
  }
})
```

### Documentation Generation
```typescript
// Create documentation page
const page = await notion.pages.create({
  parent: { database_id: docsDbId },
  properties: {
    'Title': { title: [{ text: { content: 'API Documentation' } }] },
    'Category': { select: { name: 'Technical' } }
  }
})

// Add content blocks
await notion.blocks.children.append({
  block_id: page.id,
  children: [
    { type: 'heading_1', heading_1: { rich_text: [{ text: { content: 'API Reference' } }] } },
    { type: 'paragraph', paragraph: { rich_text: [{ text: { content: 'Endpoints overview...' } }] } },
    { type: 'code', code: { 
      language: 'typescript',
      rich_text: [{ text: { content: 'const api = new API()' } }]
    }}
  ]
})
```

### Meeting Notes
```typescript
// Create meeting notes
await notion.pages.create({
  parent: { database_id: meetingsDbId },
  properties: {
    'Title': { title: [{ text: { content: 'Sprint Planning - Jan 2024' } }] },
    'Date': { date: { start: '2024-01-15' } },
    'Attendees': { people: attendeeIds }
  }
})

// Add agenda and notes
await notion.blocks.children.append({
  block_id: pageId,
  children: [
    { type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Agenda' } }] } },
    { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ text: { content: 'Review last sprint' } }] } },
    { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ text: { content: 'Plan next sprint' } }] } },
    { type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Action Items' } }] } }
  ]
})
```

## Best Practices

✅ **DO:**
- Use databases for structured data
- Cache database schemas
- Batch operations when possible
- Handle rate limits (3 requests/second)
- Use rich text for formatting
- Archive instead of delete

❌ **DON'T:**
- Make excessive API calls
- Ignore rate limiting
- Store large binary files
- Skip error handling
- Hardcode database IDs

## Configuration

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-notion"],
      "env": {
        "NOTION_API_KEY": "secret_xxx",
        "NOTION_VERSION": "2022-06-28"
      }
    }
  }
}
```

**Setup:**
1. Create integration at https://www.notion.so/my-integrations
2. Copy internal integration token
3. Share databases/pages with integration
4. Use token as `NOTION_API_KEY`

## Integration Patterns

### Sync Tasks from Code
```typescript
// Sync OpenSpec tasks to Notion
const tasks = parseOpenSpecTasks('openspec/changes/my-feature/tasks.md')

for (const task of tasks) {
  await notion.pages.create({
    parent: { database_id: tasksDbId },
    properties: {
      'Task': { title: [{ text: { content: task.title } }] },
      'Status': { select: { name: task.completed ? 'Done' : 'To Do' } },
      'Source': { select: { name: 'OpenSpec' } }
    }
  })
}
```

### Generate Changelog
```typescript
// Query completed tasks
const completed = await notion.databases.query({
  database_id: tasksDbId,
  filter: {
    and: [
      { property: 'Status', select: { equals: 'Done' } },
      { property: 'Completed', date: { after: '2024-01-01' } }
    ]
  }
})

// Generate CHANGELOG.md entries
const entries = completed.results.map(task => 
  `- ${task.properties.Task.title[0].plain_text}`
)
```

<!-- NOTION:END -->

