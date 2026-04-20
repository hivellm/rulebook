<!-- RULEBOOK_MCP:START -->
# Rulebook MCP Server Instructions

**CRITICAL**: Use MCP Rulebook server to manage tasks programmatically instead of executing terminal commands.

## Core Functions

### 1. rulebook_task_create
Create a new Rulebook task with OpenSpec-compatible format:
```
rulebook_task_create({
  taskId: "add-feature-name",
  proposal: {
    why: "Users need this feature...",
    whatChanges: "Add feature with X, Y, Z",
    impact: {
      affectedSpecs: ["specs/module/spec.md"],
      affectedCode: ["src/module/"],
      breakingChange: false,
      userBenefit: "Better user experience"
    }
  }
})
```

### 2. rulebook_task_list
List all tasks with optional filters:
```
rulebook_task_list({
  status: "in-progress",
  includeArchived: false
})
```

### 3. rulebook_task_show
Show detailed task information:
```
rulebook_task_show({
  taskId: "add-feature-name"
})
```

### 4. rulebook_task_update
Update task status or progress:
```
rulebook_task_update({
  taskId: "add-feature-name",
  status: "in-progress",
  progress: 50
})
```

### 5. rulebook_task_validate
Validate task format against OpenSpec requirements:
```
rulebook_task_validate({
  taskId: "add-feature-name"
})
```

### 6. rulebook_task_archive
Archive completed task and apply spec deltas:
```
rulebook_task_archive({
  taskId: "add-feature-name",
  skipValidation: false
})
```

## Workflow

**When creating tasks:**
```
1. Use rulebook_task_create instead of terminal command
2. Provide complete proposal with why/whatChanges/impact
3. Verify task creation with rulebook_task_show
```

**When managing task progress:**
```
1. Use rulebook_task_list to see all tasks
2. Update status with rulebook_task_update as work progresses
3. Validate format with rulebook_task_validate before archiving
4. Archive completed tasks with rulebook_task_archive
```

**Before archiving:**
```
1. Always run rulebook_task_validate first
2. Fix any validation errors
3. Ensure all tasks in tasks.md are completed
4. Archive with skipValidation: false
```

## Best Practices

✅ **DO:**
- Use MCP functions instead of terminal commands for task management
- Always validate tasks before archiving
- Update task status as work progresses
- Provide complete proposal information when creating tasks
- Check task details with rulebook_task_show before operations

❌ **DON'T:**
- Execute `rulebook task create` commands in terminal
- Archive tasks without validation
- Skip proposal content when creating tasks
- Use terminal commands when MCP functions are available

## Configuration

The Rulebook MCP server is configured in `.cursor/mcp.json`:

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

For production (npx):
```json
{
  "mcpServers": {
    "rulebook": {
      "command": "npx",
      "args": ["-y", "@hivehub/rulebook@latest", "mcp-server"],
      "env": {}
    }
  }
}
```

## Integration

The MCP server integrates seamlessly with:
- Cursor IDE (via `.cursor/mcp.json`)
- Claude Desktop (via config file)
- Other MCP-compatible clients

All task operations are available through MCP functions, eliminating the need for terminal command execution.

## Compression tools (v5.4.0)

### rulebook_compress

Compress a markdown memory file in place, preserving code blocks,
URLs, file paths, dates, and version numbers byte-for-byte. Writes a
backup to `<file>.original.md` before overwriting. Returns before/after
byte counts, compression percentage, retry count, and backup path.

```
rulebook_compress({
  filePath: "CLAUDE.md",           // or absolute path
  dryRun: false                    // when true, returns stats without writing
})
```

Rejects the result if the prose rewriter breaks any invariant (heading
text/level, fenced-code content, inline code, URL, path, date, version).
`success: false` is returned with the first 10 violations.

### rulebook_compress_list

List candidate markdown memory files in the project:
`CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`, `AGENTS.override.md`,
`.rulebook/PLANS.md`, `.rulebook/STATE.md`, and every `.md` under
`.rulebook/knowledge/` and `.rulebook/learnings/`. Excludes
`*.original.md` backups. Reports current size, whether a backup exists,
and the backup's size + ratio when present. Results sorted by size
descending so the biggest-win targets surface first.

## Evaluation tools (v5.4.0)

### rulebook_evals_measure

Offline three-arm measurement (`baseline` / `terse` / `rulebook-terse`)
against the committed snapshot under `evals/snapshots/`. Uses tiktoken
when installed, UTF-8 byte counts as fallback. No API key required.

```
rulebook_evals_measure({})
// → { report: { tokenMode, prompts: [...], totals: {...}, pass: bool, threshold } }
```

Honest delta reported: `rulebook-terse` vs `terse` control.

### rulebook_evals_run

Regenerate snapshots against the live Anthropic API. Requires
`ANTHROPIC_API_KEY` + the optional `@anthropic-ai/sdk` npm package.
Spawns `evals/llm_run.ts` as a subprocess. Expensive — run only when
SKILL.md or prompt set changes.

## Documentation

For complete API documentation, see:
- `/docs/MCP_SERVER.md` - Full API reference
- `/docs/guides/MCP_SERVER_SETUP.md` - Setup guide
- `/README.md` - General project information

<!-- RULEBOOK_MCP:END -->

