<!-- SUPABASE:START -->
# Supabase MCP Instructions

**CRITICAL**: Use MCP Supabase for database operations, authentication, and storage.

## Core Features

### Database Operations
```typescript
// Query data
supabase.from('users').select('*')
supabase.from('users').select('id, name, email')

// Insert
supabase.from('users').insert({ name: 'John', email: 'john@example.com' })

// Update
supabase.from('users').update({ name: 'Jane' }).eq('id', 1)

// Delete
supabase.from('users').delete().eq('id', 1)

// Filters
supabase.from('users').select('*').eq('status', 'active')
supabase.from('users').select('*').gt('age', 18)
supabase.from('users').select('*').like('name', '%John%')
```

### Authentication
```typescript
// Sign up
supabase.auth.signUp({ email, password })

// Sign in
supabase.auth.signInWithPassword({ email, password })

// Sign out
supabase.auth.signOut()

// Get session
supabase.auth.getSession()

// Get user
supabase.auth.getUser()
```

### Storage
```typescript
// Upload file
supabase.storage.from('avatars').upload('path/file.jpg', file)

// Download file
supabase.storage.from('avatars').download('path/file.jpg')

// List files
supabase.storage.from('avatars').list('folder')

// Delete file
supabase.storage.from('avatars').remove(['path/file.jpg'])

// Get public URL
supabase.storage.from('avatars').getPublicUrl('path/file.jpg')
```

### Real-time Subscriptions
```typescript
// Subscribe to changes
supabase
  .channel('room1')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'users' 
  }, (payload) => {
    console.log('Change received!', payload)
  })
  .subscribe()
```

## Common Patterns

### CRUD Operations
```typescript
// Create
const { data, error } = await supabase
  .from('tasks')
  .insert({ title: 'New Task', completed: false })
  .select()

// Read
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('completed', false)

// Update
const { data, error } = await supabase
  .from('tasks')
  .update({ completed: true })
  .eq('id', taskId)

// Delete
const { data, error } = await supabase
  .from('tasks')
  .delete()
  .eq('id', taskId)
```

### Authentication Flow
```typescript
// 1. Sign up user
const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password'
})

// 2. Sign in
const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
})

// 3. Check session
const { data: { session } } = await supabase.auth.getSession()

// 4. Sign out
await supabase.auth.signOut()
```

### File Upload with Validation
```typescript
// 1. Validate file
if (file.size > 5 * 1024 * 1024) {
  throw new Error('File too large (max 5MB)')
}

// 2. Upload
const { data, error } = await supabase.storage
  .from('uploads')
  .upload(`${userId}/${file.name}`, file, {
    cacheControl: '3600',
    upsert: false
  })

// 3. Get public URL
if (!error) {
  const { data: { publicUrl } } = supabase.storage
    .from('uploads')
    .getPublicUrl(`${userId}/${file.name}`)
}
```

## Best Practices

✅ **DO:**
- Use Row Level Security (RLS) policies
- Handle errors properly (`if (error) throw error`)
- Use `.select()` after insert/update to get returned data
- Use prepared statements (automatic with Supabase)
- Enable real-time only when needed
- Use storage buckets with proper permissions

❌ **DON'T:**
- Expose service role key in client code
- Skip RLS policies (always enable)
- Ignore error responses
- Store sensitive data without encryption
- Use anon key for admin operations

## Configuration

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-supabase"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

**Security:**
- Use `SUPABASE_ANON_KEY` for client-side operations
- Use `SUPABASE_SERVICE_ROLE_KEY` only server-side
- Never commit keys to version control
- Enable RLS on all tables

## Integration with Development

### Testing
```typescript
// Use test database for development
const supabase = createClient(
  process.env.SUPABASE_TEST_URL,
  process.env.SUPABASE_TEST_KEY
)

// Clean up after tests
afterEach(async () => {
  await supabase.from('test_table').delete().neq('id', 0)
})
```

### Migrations
```bash
# Create migration
supabase migration new add_users_table

# Apply migrations
supabase db push

# Reset database
supabase db reset
```

<!-- SUPABASE:END -->

