# Migration Guide: Rulebook v1.x to v2.0

This guide helps existing Rulebook users upgrade from v1.x to v2.0, which introduces the new Skills System.

## What's New in v2.0

Version 2.0 introduces a **Skills System** that provides modular, reusable AI instructions:

- **Skills Architecture**: Templates organized into 10 categories (languages, frameworks, modules, services, etc.)
- **Auto-Detection**: Skills are automatically enabled based on your project's tech stack
- **CLI Commands**: New `rulebook skill` commands for managing skills
- **MCP Integration**: 7 new MCP functions for programmatic skill management
- **AI CLI Files**: Automatic generation of CLAUDE.md, CODEX.md, GEMINI.md

## Upgrade Steps

### 1. Update Rulebook

```bash
# Using npm
npm update @hivehub/rulebook

# Or install latest
npm install @hivehub/rulebook@latest
```

### 2. Run Update Command

The update command preserves your existing configuration while adding new skills:

```bash
npx rulebook update
```

This will:
- Detect your project's languages, frameworks, modules, and services
- Auto-enable matching skills
- Update your AGENTS.md with the new skills index
- Preserve any custom sections in your existing AGENTS.md

### 3. Verify Skills Configuration

Check which skills were enabled:

```bash
npx rulebook skill list --enabled
```

### 4. Customize Skills (Optional)

Add or remove skills as needed:

```bash
# Add a skill
npx rulebook skill add languages/python

# Remove a skill
npx rulebook skill remove frameworks/django
```

## Configuration Changes

### .rulebook File

The `.rulebook` configuration file now includes a `skills` section:

**Before (v1.x):**
```json
{
  "version": "1.0.0",
  "languages": ["typescript"],
  "frameworks": ["nestjs"],
  "features": { ... }
}
```

**After (v2.0):**
```json
{
  "version": "2.0.0",
  "languages": ["typescript"],
  "frameworks": ["nestjs"],
  "features": { ... },
  "skills": {
    "enabled": [
      "languages/typescript",
      "frameworks/nestjs",
      "core/rulebook",
      "core/quality-enforcement"
    ]
  }
}
```

### AGENTS.md Changes

The AGENTS.md file now includes:

1. **Project Capabilities Section**: Summary of enabled skills grouped by category
2. **Skills Index**: Table listing all installed skills with descriptions
3. **Skill References**: Links to individual skill documentation in `/rulebook/`

## Breaking Changes

### None for Existing Projects

v2.0 is fully backward compatible:

- Existing `.rulebook` configurations work without modification
- The `skills` section is added automatically on first update
- Custom AGENTS.md sections are preserved
- All existing CLI commands work unchanged

### Type Changes (For Developers)

If you're using Rulebook types programmatically:

```typescript
// SkillsConfig now has optional fields
interface SkillsConfig {
  enabled: string[];
  disabled?: string[];  // Now optional
  order?: string[];     // Now optional
}

// autoDetectSkills accepts partial config
skillsManager.autoDetectSkills(config: Partial<RulebookConfig>)
```

## New Features to Explore

### Skill Commands

```bash
# List all available skills
npx rulebook skill list

# Search for skills
npx rulebook skill search "database"

# Show skill details
npx rulebook skill show languages/rust

# Validate skill configuration
npx rulebook skill validate
```

### MCP Skills Functions

If using the MCP server, new functions are available:

- `rulebook_skill_list` - List available skills
- `rulebook_skill_show` - Get skill details
- `rulebook_skill_enable` - Enable a skill
- `rulebook_skill_disable` - Disable a skill
- `rulebook_skill_search` - Search skills
- `rulebook_skill_validate` - Validate configuration

### AI CLI Files

Run init or update to generate AI CLI configuration files:

- `CLAUDE.md` - For Claude Code CLI
- `CODEX.md` - For OpenAI Codex CLI
- `GEMINI.md` - For Google Gemini CLI
- `gemini-extension.json` - Gemini CLI extension manifest

## Troubleshooting

### Skills Not Detected

If skills aren't being auto-detected, ensure your project has:
- A `package.json`, `Cargo.toml`, or language-specific config file
- Dependencies listed in your package manager's config
- Source files in expected locations

### Custom Skills

Create custom skills in your project:

1. Create a skill file: `skills/my-custom-skill/SKILL.md`
2. Add YAML frontmatter with metadata
3. Enable in config: `skills.customSkillsPath: "./skills"`

### MCP Server Issues

If MCP skills functions aren't working:

```bash
# Reinitialize MCP configuration
npx rulebook mcp init

# Verify server is running
npx rulebook-mcp
```

## Getting Help

- Documentation: https://github.com/hivellm/rulebook
- Issues: https://github.com/hivellm/rulebook/issues
- Changelog: See CHANGELOG.md for detailed v2.0 changes
