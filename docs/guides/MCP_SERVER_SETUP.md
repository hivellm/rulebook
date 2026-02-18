# MCP Server Setup Guide

This guide explains how to set up and use the Rulebook MCP Server for task management.

## Prerequisites

- Node.js 20+ installed
- Rulebook installed (`npm install -g @hivellm/rulebook` or local installation)
- Cursor IDE or other MCP-compatible client

## Installation

### Option 1: Using npx (Recommended)

No installation needed. The server runs directly from npm:

```bash
# Test the server
npx @hivellm/rulebook@latest mcp-server
```

### Option 2: Local Installation

```bash
# Install Rulebook locally
npm install @hivellm/rulebook

# Build the project
npm run build

# Run MCP server
npm run mcp-server
```

## Configuration

### Cursor Configuration

1. **Create or edit `.cursor/mcp.json`** in your project root:

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

2. **For development mode** (using local build):

```json
{
  "mcpServers": {
    "rulebook": {
      "command": "node",
      "args": ["dist/mcp/rulebook-server.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

3. **For production mode** (using npx):

```json
{
  "mcpServers": {
    "rulebook": {
      "command": "npx",
      "args": [
        "-y",
        "@hivellm/rulebook@latest",
        "mcp-server"
      ],
      "env": {}
    }
  }
}
```

### Claude Desktop Configuration

**macOS:**
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:**
Edit `%APPDATA%\Claude\claude_desktop_config.json`

Add the same configuration as above.

## Automated Setup (CI/CD)

### GitHub Actions

The MCP configuration is automatically created during CI builds. The setup script detects the IDE environment and creates the appropriate configuration file.

**In your workflow**:
```yaml
- name: Build project
  run: npm run build

- name: Setup MCP configuration
  env:
    MCP_IDE: ${{ vars.MCP_IDE || 'cursor' }}
  run: |
    node scripts/setup-mcp-config.js
  continue-on-error: true
```

**Available IDE options**:
- `cursor` - Creates `.cursor/mcp.json` (default)
- `claude` or `claude-desktop` - Creates `claude_desktop_mcp.json`
- Any other value - Creates `mcp.json` (generic)

**Manual setup script**:
```bash
# Setup MCP config for Cursor (default)
npm run setup:mcp

# Setup for specific IDE
MCP_IDE=claude npm run setup:mcp
```

## Verification

### Test Server Startup

1. **Manual test**:
```bash
node dist/mcp/rulebook-server.js
# Server should start and wait for stdio input
```

2. **Via Cursor**:
- Open Cursor Settings
- Navigate to MCP section
- Verify "rulebook" server shows as connected
- Check that all 6 tools are listed

### Test Functions

Use Cursor's MCP panel to test functions:

1. **List tasks**: Click `rulebook_task_list` - should return list of tasks
2. **Show task**: Click `rulebook_task_show` with task ID - should return task details
3. **Create task**: Click `rulebook_task_create` with task ID - should create new task

## Usage Examples

### Creating a Task

```typescript
// Via MCP in Cursor
// Use the rulebook_task_create tool with:
{
  "taskId": "my-new-feature",
  "proposal": {
    "why": "This feature improves user experience significantly",
    "whatChanges": "Add new feature with X, Y, and Z capabilities",
    "impact": {
      "affectedSpecs": ["features/spec.md"],
      "affectedCode": ["src/features/"],
      "breakingChange": false,
      "userBenefit": "Better user experience and productivity"
    }
  }
}
```

### Listing Tasks

```typescript
// List all in-progress tasks
{
  "status": "in-progress",
  "includeArchived": false
}
```

### Updating Task Status

```typescript
// Mark task as completed
{
  "taskId": "my-new-feature",
  "status": "completed"
}
```

## Troubleshooting

### Server Won't Start

**Error**: `Cannot find module 'dist/mcp/rulebook-server.js'`

**Solution**: Run `npm run build` to compile TypeScript files.

### Tools Not Appearing

**Problem**: Tools don't show in Cursor MCP panel

**Solutions**:
1. Restart Cursor completely
2. Check `.cursor/mcp.json` syntax (valid JSON)
3. Verify server is running in Cursor MCP status
4. Check Cursor logs for errors

### Schema Errors

**Error**: `keyValidator._parse is not a function`

**Solution**: 
```bash
npm install zod@3.25.76
npm run build
```

### Permission Errors

**Error**: `EACCES: permission denied`

**Solution**: Ensure write permissions on `rulebook/tasks/` directory:
```bash
chmod -R u+w rulebook/tasks/
```

## Advanced Configuration

### Custom Project Root

If your project structure differs, specify custom root:

```json
{
  "mcpServers": {
    "rulebook": {
      "command": "node",
      "args": [
        "dist/mcp/rulebook-server.js",
        "--project-root",
        "/path/to/project"
      ],
      "env": {}
    }
  }
}
```

### Environment Variables

You can pass environment variables:

```json
{
  "mcpServers": {
    "rulebook": {
      "command": "node",
      "args": ["dist/mcp/rulebook-server.js"],
      "env": {
        "RULEBOOK_DIR": "custom-rulebook",
        "DEBUG": "true"
      }
    }
  }
}
```

## Next Steps

- Read [MCP_SERVER.md](../MCP_SERVER.md) for complete API documentation
- Review [RULEBOOK.md](../../rulebook/specs/RULEBOOK.md) for task management guidelines
- Check [README.md](../../README.md) for general project information

