# Getting Started with Rulebook

This guide will help you get started with @hivellm/rulebook to standardize your AI-assisted development workflow.

## Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- An existing project (Rust, TypeScript, or Python)

## Installation

You don't need to install rulebook to use it. Simply run:

```bash
npx @hivellm/rulebook init
```

Or install globally:

```bash
npm install -g @hivellm/rulebook
rulebook init
```

## First-Time Setup

### Step 1: Navigate to Your Project

```bash
cd /path/to/your/project
```

### Step 2: Run Rulebook Init

```bash
npx @hivellm/rulebook init
```

### Step 3: Answer the Prompts

Rulebook will ask you several questions:

1. **Language Confirmation**: Confirm the detected language or select manually
2. **Project Type**: Choose application, library, CLI, or monorepo
3. **MCP Modules**: Select which modules you want rules for (Vectorizer, Synap, etc.)
4. **IDE Preferences**: Choose your IDE (Cursor, Windsurf, VS Code, Copilot)
5. **Coverage Threshold**: Set minimum test coverage (default: 95%)
6. **Documentation Strictness**: Enable strict /docs structure enforcement
7. **Workflow Generation**: Choose whether to generate GitHub Actions workflows

### Step 4: Review Generated AGENTS.md

Open `AGENTS.md` in your project root and review the generated rules.

### Step 5: Set Up Documentation Structure

Create the recommended documentation structure:

```bash
mkdir -p docs/{specs,guides,diagrams,benchmarks,versions}
```

### Step 6: Use with Your AI Assistant

Open your project in your AI-enabled IDE (Cursor, Windsurf, etc.) and start coding. The AI will follow the rules in AGENTS.md.

## Quick Examples

### Example 1: New Rust Project

```bash
# Create new Rust project
cargo new my-project
cd my-project

# Initialize rulebook
npx @hivellm/rulebook init --yes

# Review generated AGENTS.md
cat AGENTS.md
```

### Example 2: Existing TypeScript Project

```bash
# Navigate to existing project
cd existing-ts-project

# Initialize rulebook (interactive)
npx @hivellm/rulebook init

# Answer prompts:
# - Language: TypeScript ✓
# - Type: Application
# - Modules: Vectorizer, Context7
# - IDE: Cursor
# - Coverage: 95%
# - Strict docs: Yes
# - Workflows: Yes
```

### Example 3: Merging with Existing AGENTS.md

```bash
# Project already has AGENTS.md
cd project-with-agents

# Initialize rulebook
npx @hivellm/rulebook init

# When prompted, choose:
# "Merge - Add/update RULEBOOK block only"

# Backup is created automatically
# Review the merged AGENTS.md
```

## Customization

### Using .rulesignore

Create a `.rulesignore` file in your project root to disable specific rules:

```
# .rulesignore
coverage-threshold
rust/edition-2024
typescript/*
```

### Adjusting Coverage Threshold

During init, set your preferred coverage:

```
Minimum test coverage percentage: 80
```

Or edit AGENTS.md manually after generation.

### Custom Documentation Structure

If you prefer a different structure, disable strict docs:

```
Enforce strict documentation structure (/docs only)? No
```

## Workflow Integration

### With Cursor

1. Open project in Cursor
2. Cursor automatically reads AGENTS.md
3. AI follows the rules when coding
4. Use @AGENTS.md in chat to reference rules

### With Windsurf

1. Open project in Windsurf
2. AI reads AGENTS.md on startup
3. Rules are applied to all AI suggestions

### With VS Code + Copilot

1. Open project in VS Code
2. GitHub Copilot reads AGENTS.md
3. Suggestions follow the defined patterns

## Common Tasks

### Update Rules

Re-run init to update rules:

```bash
npx @hivellm/rulebook init
```

Choose "Replace" or "Merge" when prompted.

### Add New Language

If you add a new language to your project:

```bash
npx @hivellm/rulebook init
```

Select the new language when prompted.

### Generate Workflows

If you skipped workflow generation initially:

```bash
# Coming in v0.2.0
npx @hivellm/rulebook workflows
```

### Validate Project

Check if your project follows rulebook standards:

```bash
# Coming in v0.3.0
npx @hivellm/rulebook validate
```

## Troubleshooting

### Language Not Detected

If your language isn't detected:

1. Ensure you have language-specific files (Cargo.toml, package.json, pyproject.toml)
2. Run with --verbose for debug info (coming soon)
3. Manually select language during prompts

### AGENTS.md Not Working with IDE

1. Ensure AGENTS.md is in project root
2. Restart your IDE
3. Check IDE-specific configuration
4. Verify AGENTS.md syntax is correct

### Rules Too Strict

Use .rulesignore to disable specific rules:

```
# .rulesignore
coverage-threshold
strict-docs
```

## Next Steps

- Read the [CLI Specification](../specs/CLI_SPEC.md)
- Explore [Example Projects](../examples/)
- Learn about [Best Practices](./BEST_PRACTICES.md)
- Contribute to the project

## Getting Help

- 📖 [Documentation](https://github.com/hivellm/rulebook/docs)
- 🐛 [Report Issues](https://github.com/hivellm/rulebook/issues)
- 💬 [Discussions](https://github.com/hivellm/rulebook/discussions)

