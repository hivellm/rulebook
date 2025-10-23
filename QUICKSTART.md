# Quick Start - @hivellm/rulebook

Get started with @hivellm/rulebook in under 5 minutes!

## Installation

No installation needed! Use npx to run directly:

```bash
npx @hivellm/rulebook init
```

## 5-Minute Setup

### 1. Navigate to Your Project (30 seconds)

```bash
cd my-awesome-project
```

### 2. Initialize Rulebook (2 minutes)

```bash
npx @hivellm/rulebook init
```

Answer the prompts:
- ✅ Confirm detected language (or select manually)
- ✅ Choose project type (application/library/CLI/monorepo)
- ✅ Select MCP modules if available
- ✅ Choose your IDE (Cursor/Windsurf/VS Code/Copilot)
- ✅ Set coverage threshold (default: 95%)
- ✅ Enable strict docs (recommended: yes)
- ✅ Generate workflows (recommended: yes)

**Result**: AGENTS.md created with your standards!

### 3. Generate Documentation Structure (1 minute)

```bash
npx @hivellm/rulebook generate-docs
```

**Result**: Complete /docs structure + open source files!

### 4. Validate Your Setup (30 seconds)

```bash
npx @hivellm/rulebook validate
```

**Result**: Quality score and recommendations!

### 5. Start Coding (1 minute)

Open your IDE (Cursor, Windsurf, VS Code) and start coding!

**Your AI assistant now follows the standards in AGENTS.md** 🎉

## What You Get

After running the above commands, your project will have:

### ✅ Standards & Rules
- `AGENTS.md` - AI assistant rules and standards
- `.cursorrules` or `.windsurfrules` - IDE-specific rules
- `.github/copilot-instructions.md` - Copilot configuration

### ✅ CI/CD Workflows
- `.github/workflows/` - GitHub Actions for your language
  - Test workflow (cross-platform)
  - Lint workflow
  - Codespell workflow

### ✅ Documentation
- `/docs` directory with professional structure
- `ROADMAP.md` - Project roadmap template
- `ARCHITECTURE.md` - System architecture template
- `DAG.md` - Component dependencies
- `CONTRIBUTING.md` - Contribution guidelines
- `CODE_OF_CONDUCT.md` - Code of conduct
- `SECURITY.md` - Security policy

### ✅ Quality Enforcement
- Test coverage requirements (95%+ by default)
- Linting standards (zero warnings)
- Documentation structure
- Feature development workflow

## Example: New Rust Project

```bash
# Create new Rust project
cargo new my-rust-app
cd my-rust-app

# Initialize rulebook
npx @hivellm/rulebook init --yes

# Generate docs
npx @hivellm/rulebook generate-docs --yes

# Validate
npx @hivellm/rulebook validate

# Result:
# ✅ AGENTS.md with Rust Edition 2024 standards
# ✅ Rust test and lint workflows
# ✅ Complete documentation structure
# ✅ Ready for AI-assisted development!
```

## Example: Existing TypeScript Project

```bash
# Navigate to project
cd existing-ts-project

# Initialize (interactive)
npx @hivellm/rulebook init

# Choose "Merge" if AGENTS.md exists
# Review generated AGENTS.md

# Check your dependencies
npx @hivellm/rulebook check-deps

# Check coverage
npx @hivellm/rulebook check-coverage

# Result:
# ✅ Standards merged with existing AGENTS.md
# ✅ Workflows added
# ✅ Dependencies analyzed
# ✅ Coverage verified
```

## Common Commands

```bash
# Initialize with defaults (no prompts)
npx @hivellm/rulebook init --yes

# Generate workflows only
npx @hivellm/rulebook workflows

# Validate project
npx @hivellm/rulebook validate

# Check dependencies
npx @hivellm/rulebook check-deps

# Check coverage (custom threshold)
npx @hivellm/rulebook check-coverage --threshold 90

# Generate documentation
npx @hivellm/rulebook generate-docs
```

## Next Steps

After setup:

1. **Review AGENTS.md** - Customize if needed
2. **Add to Git**: `git add AGENTS.md .github/ docs/`
3. **Commit**: `git commit -m "Add rulebook standards"`
4. **Start Coding** - Your AI assistant now follows standards!
5. **Run Validations** - Use `validate` and `check-*` commands regularly

## Troubleshooting

### AI Not Following Rules

```bash
# Make sure AGENTS.md is in project root
ls -la AGENTS.md

# Re-initialize if needed
npx @hivellm/rulebook init
```

### Workflows Not Working

```bash
# Regenerate workflows
npx @hivellm/rulebook workflows

# Check .github/workflows/ directory
ls -la .github/workflows/
```

### Need Different Standards

```bash
# Create .rulesignore to disable specific rules
echo "coverage-threshold" > .rulesignore

# Or re-run init to change settings
npx @hivellm/rulebook init
```

## Get Help

```bash
# Show all commands
npx @hivellm/rulebook --help

# Show command help
npx @hivellm/rulebook init --help
```

## Support

- 📖 [Full Documentation](https://github.com/hivellm/rulebook/docs)
- 🐛 [Report Issues](https://github.com/hivellm/rulebook/issues)
- 💬 [Discussions](https://github.com/hivellm/rulebook/discussions)

---

**That's it! You're ready to build with AI assistance and consistent standards!** 🚀

