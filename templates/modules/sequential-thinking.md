<!-- SEQUENTIAL_THINKING:START -->
# Sequential Thinking MCP

Sequential thinking MCP enables structured, step-by-step problem solving for complex tasks.

## When to Use

Use sequential thinking for:
- Complex architectural decisions requiring multiple trade-off analyses
- Debugging hard-to-reproduce issues
- Planning multi-step implementations before writing code
- Tasks where mistakes are costly (data migrations, API changes)

## Usage Pattern

```
mcp__sequential-thinking__sequentialthinking
```

Call with a thought/problem to explore it step by step before committing to an implementation.

## Integration

When sequential thinking MCP is available:
1. Start complex tasks with a thinking step to plan the approach
2. Use it to validate assumptions before writing code
3. Record key decisions from the thinking process in task spec files

## Install (if not configured)

```bash
# Add to .mcp.json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```
<!-- SEQUENTIAL_THINKING:END -->
