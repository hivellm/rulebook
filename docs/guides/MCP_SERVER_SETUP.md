# MCP Server Setup Guide

This guide explains how to set up and use the Rulebook MCP Server for task management.

## Prerequisites

- Node.js 20+ installed
- Rulebook installed (`npm install -g @hivehub/rulebook` or local installation)
- Cursor IDE or other MCP-compatible client

## Installation

### Option 1: Using npx (Recommended)

`rulebook init`, `rulebook update` and `rulebook mcp init` write this entry to
`.mcp.json`, pinned to the installed rulebook version (never `@latest`, so every
session runs the same build and none re-installs after a release). `rulebook
update` moves the pin and rewrites older `@latest` or `mcp-server` entries; a
rulebook entry you changed by hand (for example `node <path>`) is left alone.

```json
{
  "mcpServers": {
    "rulebook": {
      "command": "npx",
      "args": ["-y", "--package=@hivehub/rulebook@7.5.0", "rulebook-mcp"]
    }
  }
}
```

### Fast path (opt-in, this machine only)

npx costs about 1 s and 4 processes per session. Running the installed server
with `node` takes 1 process and 0.1–0.3 s, but its absolute path only works on
your machine, so it is not written to the checked-in `.mcp.json`:

```bash
npm install -g @hivehub/rulebook   # a stable install path
rulebook mcp init --fast           # in the project folder
```

This registers `node <install>/dist/mcp/rulebook-server.bundle.js` (the
single-file build; `rulebook-server.js` when the bundle is absent) in Claude
Code's **local** scope with `claude mcp add --scope local`. Local scope applies
to this machine and project only and overrides the `.mcp.json` entry of the
same name. If the `claude` CLI is not on PATH, the command prints the exact
`claude mcp add …` line to run. It also prints the `~/.codex/config.toml`
snippet for Codex; rulebook does not edit that file. `rulebook update`
re-registers the entry when it points at a removed install or another version.
Undo with `claude mcp remove --scope local rulebook`.

### Option 2: Local Installation

```bash
# Install Rulebook locally
npm install @hivehub/rulebook

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

## Workspace Mode (Multi-Project)

> **NEW in v4.2.0** — Manage multiple projects with a single MCP server.

### Setup

```bash
# 1. Initialize workspace at monorepo root
cd my-monorepo
rulebook workspace init

# 2. Setup MCP in workspace mode
rulebook mcp init --workspace
```

This creates a single `.mcp.json` with the `--workspace` flag, pinned to the installed rulebook version (`rulebook update` moves the pin):

```json
{
  "mcpServers": {
    "rulebook": {
      "command": "npx",
      "args": ["-y", "--package=@hivehub/rulebook@7.5.0", "rulebook-mcp", "--workspace"]
    }
  }
}
```

### How It Works

In workspace mode, the MCP server:

1. Reads `.rulebook/workspace.json` (or auto-discovers from `*.code-workspace` / monorepo config)
2. Creates isolated `ProjectWorker` instances per project (each with own TaskManager, MemoryManager, etc.)
3. Routes all tool calls via the optional `projectId` parameter
4. Spawns workers on-demand, kills idle ones after 5 minutes

### Using projectId

All existing MCP tools accept an optional `projectId`:

```json
// Create task in the frontend project
{ "taskId": "add-auth", "projectId": "frontend" }

// Search memory in backend
{ "query": "database schema", "projectId": "backend" }

// If projectId is omitted, uses the defaultProject from workspace config
{ "taskId": "fix-bug" }  // → goes to defaultProject
```

### Workspace-Specific Tools

| Tool | Description |
|------|-------------|
| `rulebook_workspace_list` | List all projects with paths |
| `rulebook_workspace_status` | Status of each project (worker state, task count) |
| `rulebook_workspace_search` | Cross-project memory search |
| `rulebook_workspace_tasks` | Tasks from all projects at once |

### Isolation Guarantee

Each project has completely isolated managers:
- **Tasks** → `{project}/.rulebook/tasks/`
- **Memory** → `{project}/.rulebook/memory.db`
- **Config** → `{project}/.rulebook/rulebook.json`

Cross-project operations only happen through explicit workspace tools.

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

> **Note**: Prefer workspace mode over `--project-root` with absolute paths. Absolute paths break when the repo is cloned on another machine.

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

