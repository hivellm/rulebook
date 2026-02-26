---
name: /ralph-config
id: ralph-config
category: Ralph
description: Configure Ralph autonomous loop settings and parameters.
---
<!-- RALPH:START -->
**Overview**
Manage Ralph's configuration including max iterations, AI tool selection, and other loop parameters. Configuration is stored in `.rulebook/ralph/config.json`.

**Guardrails**
- Configuration applies to future iterations only
- Changing config mid-loop may not affect current iteration
- Save configuration changes before resuming loop
- Common settings: max_iterations, ai_tool, branch_name

**Configuration Options**

### Max Iterations
Maximum number of iterations Ralph will run before stopping.
```bash
rulebook ralph config set max_iterations 20
```
- Recommended: 5-20 for most projects
- Higher values allow more complex tasks to complete
- Lower values quick validation runs

### AI Tool
Which AI tool to use for solving tasks (claude, cursor, gemini).
```bash
rulebook ralph config set ai_tool claude
```
- `claude` (recommended): Best for complex reasoning
- `cursor`: Fast iteration if you have Cursor CLI
- `gemini`: Alternative option for diversity
- Note: Tool must be installed and available on CLI

### Branch Name
Git branch Ralph works on for this loop.
```bash
rulebook ralph config set branch_name ralph/my-feature
```
- Automatically set during init
- Change if working on different feature
- Ralph commits to this branch

### Project Name
Project name for documentation and tracking.
```bash
rulebook ralph config set project_name my-project
```

**Steps**

1. **View Current Configuration**:
   ```bash
   rulebook ralph config show
   ```
   Displays all current settings

2. **Update a Setting**:
   ```bash
   rulebook ralph config set <key> <value>
   ```
   Example:
   ```bash
   rulebook ralph config set max_iterations 15
   rulebook ralph config set ai_tool cursor
   ```

3. **Reset to Defaults**:
   ```bash
   rulebook ralph config reset
   ```
   Resets to default values from init

4. **Verify Changes**:
   ```bash
   rulebook ralph status
   ```
   Shows updated config in status output

**Configuration File**
Location: `.rulebook/ralph/config.json`

Example structure:
```json
{
  "enabled": true,
  "max_iterations": 10,
  "current_iteration": 0,
  "ai_tool": "claude",
  "project_name": "my-project",
  "branch_name": "ralph/my-project",
  "paused": false
}
```

**Workflow**
1. Initialize Ralph: `rulebook ralph init` (sets initial config)
2. Review config: `rulebook ralph config show`
3. Adjust as needed: `rulebook ralph config set <key> <value>`
4. Start loop: `rulebook ralph run`
5. Monitor with: `rulebook ralph status`

**Troubleshooting**
- **Config file missing**: Run `rulebook ralph init` again
- **Settings not updating**: Ensure you're using correct key name
- **Changes not taking effect**: Pause loop, update config, then resume
- **Invalid ai_tool**: Check tool is installed (e.g., `claude --version`)

<!-- RALPH:END -->
