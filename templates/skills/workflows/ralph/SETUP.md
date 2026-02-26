# Ralph Autonomous Loop Setup Guide

## Installation

Ralph is installed as part of `@hivehub/rulebook`. To enable it as a Claude Code skill:

### Option 1: Automatic Installation (Recommended)

```bash
# During project initialization
rulebook init
# → Select "Ralph Autonomous Loop" when prompted for skills

# Or enable existing project
rulebook skill enable ralph-autonomous-loop
```

### Option 2: Manual Installation

```bash
# 1. Install rulebook (if not already installed)
npm install -g @hivehub/rulebook

# 2. Run the Ralph skill setup
bash templates/skills/workflows/ralph/install.sh

# 3. Verify installation
cat .rulebook | grep -A 5 '"ralph"'
```

## Claude Code Integration

### Configuration in .cursorrules

Ralph skill automatically adds to `.cursorrules`:

```
## Ralph Autonomous Loop

When working with Ralph autonomous loop:

1. **Before each iteration**:
   - Read .rulebook-ralph/prd.json for task specifications
   - Read .rulebook-ralph/progress.txt for past learnings
   - Reference recent git commits for architectural context

2. **During implementation**:
   - Focus on ONE task from PRD
   - Apply patterns from progress.txt
   - Write tests first (95%+ coverage required)

3. **After implementation**:
   - Run quality gates: type-check, lint, tests, coverage
   - Commit with clear message including iteration number
   - Ralph will update progress.txt with learnings

4. **Commands**:
   - Check status: rulebook ralph status
   - View history: rulebook ralph history
   - Pause loop: rulebook ralph pause (Ctrl+C)
   - Resume: rulebook ralph resume
```

### Enabling in Claude Code

When you run `npx init` or `rulebook init`, Claude Code will:

1. ✅ Detect Ralph skill in `.rulebook` configuration
2. ✅ Register Ralph commands and MCP tools
3. ✅ Load Ralph documentation into context
4. ✅ Enable Ralph-specific prompting

### Using Ralph in Claude Code

```bash
# After initialization, Ralph is available via:
rulebook ralph <command>

# Example workflow:
1. Create tasks
2. Initialize Ralph
3. Run autonomous loop
4. Monitor progress
5. Review and deploy
```

## Configuration

### .rulebook Configuration

```json
{
  "ralph": {
    "enabled": true,
    "maxIterations": 10,
    "tool": "claude",
    "maxContextLoss": 3
  }
}
```

**Options**:
- `enabled` (boolean): Enable Ralph autonomous loop
- `maxIterations` (number): Max iterations before stopping
- `tool` (string): AI CLI tool ("claude", "amp", "gemini")
- `maxContextLoss` (number): Tolerance for incomplete outputs

### Directory Structure

Ralph creates and uses:

```
.rulebook-ralph/
├── prd.json                    # Task specifications (auto-generated)
├── progress.txt                # Append-only learning log
└── history/                    # Per-iteration metadata
    ├── iteration-1.json
    ├── iteration-2.json
    └── ...
```

## Quick Start

```bash
# 1. Create tasks (can be multiple)
rulebook task create implement-auth
rulebook task create add-api-endpoints
rulebook task create write-tests

# 2. Initialize Ralph
rulebook ralph init
# → Creates .rulebook-ralph/prd.json from tasks
# → Initializes progress.txt

# 3. Start autonomous loop
rulebook ralph run --max-iterations 10
# → Ralph picks first task
# → Runs Claude Code to implement
# → Runs quality checks
# → Updates task status and progress.txt
# → Repeats for next task

# 4. Monitor progress
rulebook ralph status           # Current status
rulebook ralph history          # Iteration history
rulebook ralph history --learnings  # What was learned

# 5. Pause/resume if needed
rulebook ralph pause            # Gracefully pause
rulebook ralph resume           # Continue later
```

## MCP Server Integration

Ralph commands are available via MCP for programmatic use:

```bash
# Start MCP server
rulebook-mcp

# Available tools:
# - rulebook_ralph_init: Initialize Ralph
# - rulebook_ralph_run: Start autonomous loop
# - rulebook_ralph_status: Query loop status
# - rulebook_ralph_get_iteration_history: Fetch history
```

## Troubleshooting

### Ralph not found after installation

```bash
# Ensure @hivehub/rulebook is installed
npm list -g @hivehub/rulebook

# If not installed
npm install -g @hivehub/rulebook

# Verify Ralph skill is registered
rulebook skill list | grep ralph
```

### .rulebook configuration not created

```bash
# Run init if not already done
rulebook init

# Manually enable Ralph
rulebook skill enable ralph-autonomous-loop
```

### Claude Code not recognizing Ralph commands

```bash
# Ensure .cursorrules is updated
cat .cursorrules | grep -i ralph

# Manually add Ralph section if missing
echo "
## Ralph Autonomous Loop
[See SKILL.md for full content]
" >> .cursorrules
```

## Next Steps

1. **Read SKILL.md** — Full documentation
2. **Review manifest.json** — Complete skill specification
3. **Run examples** — Try the quick start commands
4. **Monitor iterations** — Use `rulebook ralph history`
5. **Customize** — Adjust maxIterations, tool, etc. in .rulebook

## Documentation

- **SKILL.md** — Complete Ralph skill documentation
- **manifest.json** — Skill specification and metadata
- **install.sh** — Installation/setup script
- **SETUP.md** — This file

## Support

For issues or questions:

- Check `rulebook ralph --help`
- Review `rulebook ralph history` for error messages
- See [Ralph GitHub](https://github.com/snarktank/ralph) for pattern details
- Check [Rulebook docs](https://github.com/hivellm/rulebook) for CLI reference
