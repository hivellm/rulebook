# Proposal: Add MCP Task Management

## Why

Currently, AI models need to execute terminal commands (`rulebook task create`, `rulebook task list`, etc.) to manage tasks, which has several limitations:

- **Terminal dependency**: Models must execute shell commands, which can fail or be inconsistent across environments
- **No direct integration**: Tasks cannot be managed directly through MCP protocol, requiring command-line interface
- **Limited automation**: AI assistants cannot programmatically interact with task management system
- **Context switching**: Models must switch between MCP tools and terminal commands, reducing efficiency
- **Error handling**: Terminal command failures are harder to handle programmatically than MCP function responses

By creating an MCP server for Rulebook task management, we enable:
- **Direct MCP integration**: AI models can use MCP functions instead of terminal commands
- **Better error handling**: Structured responses with proper error codes and messages
- **Consistent interface**: Same MCP protocol used for other operations (Vectorizer, Synap, Context7)
- **Improved automation**: AI agents can manage tasks programmatically without shell execution
- **Better UX**: Models can query task status, create tasks, and archive tasks through MCP functions

## What Changes

- **ADDED** MCP server implementation for Rulebook task management
- **ADDED** MCP functions for task CRUD operations:
  - `rulebook_task_create` - Create new task
  - `rulebook_task_list` - List all tasks (with filters)
  - `rulebook_task_show` - Show task details
  - `rulebook_task_update` - Update task status/progress
  - `rulebook_task_validate` - Validate task format
  - `rulebook_task_archive` - Archive completed task
- **ADDED** MCP server configuration template
- **ADDED** Integration with existing task-manager.ts module
- **ADDED** MCP function handlers that wrap CLI commands
- **MODIFIED** Documentation to include MCP server setup instructions
- **MODIFIED** AGENTS.md generation to include MCP task management directives

## Impact

- **Affected specs**: MCP module specification
- **Affected code**:
  - New: `src/mcp/rulebook-server.ts` - MCP server implementation
  - New: `src/mcp/handlers/` - MCP function handlers
  - Modified: `src/core/task-manager.ts` - Expose functions for MCP use
  - Modified: `templates/modules/MCP.md` - Add Rulebook MCP server template
  - Modified: `docs/` - Add MCP server documentation
- **Breaking change**: NO - This is additive functionality
- **User benefit**:
  - AI models can manage tasks through MCP instead of terminal commands
  - Better integration with existing MCP infrastructure
  - More reliable task management operations
  - Improved automation capabilities for AI agents
