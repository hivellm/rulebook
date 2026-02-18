# Claude Code Plugin Marketplace Submission Guide

This guide documents the process for submitting Rulebook to the Claude Code Plugin Marketplace.

## Plugin Structure

The Rulebook plugin follows the Claude Code plugin standard with the following structure:

```
rulebook/
├── marketplace.json         # Marketplace manifest (required for publishing)
├── .claude-plugin/
│   └── plugin.json         # Plugin manifest
├── .mcp.json               # MCP server configuration (at root)
├── commands/               # Slash commands (at root)
│   ├── rulebook-init.md
│   ├── rulebook-skill.md
│   └── rulebook-task.md
└── skills/                 # Plugin skills (at root)
    ├── rulebook-typescript/
    ├── rulebook-task-management/
    └── ...
```

## Marketplace Manifest (marketplace.json)

**REQUIRED for publishing to Claude Code marketplace:**

```json
{
  "name": "hivehub-marketplace",
  "owner": {
    "name": "HiveLLM Team",
    "email": "support@hivellm.com",
    "url": "https://github.com/hivellm"
  },
  "plugins": [
    {
      "name": "rulebook",
      "source": ".",
      "description": "Standardize AI-generated projects with skills, templates, and quality gates",
      "version": "2.0.0",
      "repository": "https://github.com/hivellm/rulebook",
      "homepage": "https://github.com/hivellm/rulebook#readme"
    }
  ]
}
```

## Plugin Manifest (.claude-plugin/plugin.json)

```json
{
  "name": "rulebook",
  "description": "Standardize AI-generated projects with skills, templates, and quality gates",
  "version": "2.0.0",
  "author": {
    "name": "HiveLLM"
  }
}
```

## Pre-Submission Checklist

### 1. Plugin Structure Validation

- [x] `marketplace.json` exists at repository root with required fields
- [x] `plugin.json` exists in `.claude-plugin/` with required fields (name, description, version, author)
- [x] `.mcp.json` exists at repository root with valid MCP server configuration
- [x] All commands have YAML frontmatter with `name` and `description`
- [x] All skills have YAML frontmatter with `name` and `description`
- [x] Version in `plugin.json` matches `package.json` and `marketplace.json`

### 2. Package Requirements

- [ ] Package published to npm: `npm publish`
- [ ] Binary available via npx: `npx @hivehub/rulebook`
- [ ] MCP server binary available: `rulebook-mcp`
- [ ] All dependencies are production-ready (no dev-only packages in dependencies)

### 3. Documentation

- [ ] README.md with installation instructions
- [ ] Clear description of what the plugin does
- [ ] Usage examples for each command
- [ ] MCP function documentation

### 4. Testing

- [ ] All tests passing: `npm test`
- [ ] Plugin structure tests passing
- [ ] MCP server functions working
- [ ] Commands documented and functional

## Submission Process

### Step 1: Verify npm Package

Ensure the package is published and accessible:

```bash
# Verify package exists
npm view @hivehub/rulebook

# Test installation
npx @hivehub/rulebook --version
```

### Step 2: Test Plugin Locally

Test the plugin in a Claude Code environment:

```bash
# Initialize a test project
mkdir test-project && cd test-project
npx @hivehub/rulebook init --yes

# Verify MCP server works
npx rulebook-mcp
```

### Step 3: Validate Plugin Structure

Run the plugin validation tests:

```bash
npx vitest run tests/claude-plugin.test.ts
```

### Step 4: Submit to Marketplace

#### Option A: GitHub Repository-based Marketplace

1. Ensure `marketplace.json` is at repository root
2. Push to GitHub: `git push origin main`
3. Users install via:
   ```bash
   /plugin marketplace add hivellm/rulebook
   /plugin install rulebook@hivehub-marketplace
   ```

#### Option B: Official Claude Code Marketplace (when available)

1. Visit the marketplace submission portal
2. Authenticate with your Claude account
3. Provide repository URL: `https://github.com/hivellm/rulebook`
4. Submit for review

#### Marketplace Installation Commands

```bash
# Add the HiveLLM marketplace
/plugin marketplace add hivellm/rulebook

# Install the rulebook plugin
/plugin install rulebook@hivehub-marketplace

# Or install directly from GitHub
/plugin install https://github.com/hivellm/rulebook
```

## Plugin Features

### Commands

| Command | Description |
|---------|-------------|
| `/rulebook-init` | Initialize Rulebook for the current project |
| `/rulebook-skill` | Manage skills (list, add, remove, show) |
| `/rulebook-task` | Manage tasks (create, list, show, validate, archive) |

### MCP Functions

| Function | Description |
|----------|-------------|
| `rulebook_task_create` | Create a new task |
| `rulebook_task_list` | List all tasks |
| `rulebook_task_show` | Show task details |
| `rulebook_task_update` | Update task file |
| `rulebook_task_validate` | Validate task structure |
| `rulebook_task_archive` | Archive completed task |
| `rulebook_task_delete` | Delete a task |
| `rulebook_skill_list` | List available skills |
| `rulebook_skill_show` | Show skill details |
| `rulebook_skill_enable` | Enable a skill |
| `rulebook_skill_disable` | Disable a skill |
| `rulebook_skill_search` | Search for skills |
| `rulebook_skill_validate` | Validate skills configuration |

### Skills

| Skill | Description |
|-------|-------------|
| `rulebook-standards` | Core project standards and quality gates |

## Version Management

When releasing a new version:

1. Update version in `package.json`
2. Update version in `.claude-plugin/plugin.json`
3. Update version in `marketplace.json` (plugins[0].version)
4. Update CHANGELOG.md
5. Run tests: `npm test`
6. Build: `npm run build`
7. Publish to npm: `npm publish`
8. Commit and push: `git push origin main`

**CRITICAL**: All three version fields must match:
- `package.json` version
- `.claude-plugin/plugin.json` version
- `marketplace.json` plugins[0].version

## Support

- Repository: https://github.com/hivellm/rulebook
- Issues: https://github.com/hivellm/rulebook/issues
- Documentation: See README.md and docs/ directory
