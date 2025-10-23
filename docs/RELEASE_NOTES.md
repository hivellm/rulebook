# Release Notes

## Version 0.2.0 - 2024-01-23

### 🎉 Major Features

#### Workflow Generation
- Automatically copies GitHub Actions workflows to `.github/workflows/`
- Language-specific workflows (Rust, TypeScript, Python)
- Always includes codespell for all projects
- Respects existing workflows (doesn't overwrite)

#### IDE File Generation
- `.cursorrules` for Cursor IDE
- `.windsurfrules` for Windsurf IDE  
- `.vscode/settings.json` for VS Code
- `.github/copilot-instructions.md` for GitHub Copilot
- Configuration respects project settings (coverage threshold, etc.)

#### New CLI Commands
```bash
# Initialize project (existing)
npx @hivellm/rulebook init

# Generate workflows only (new!)
npx @hivellm/rulebook workflows

# Validate project (coming in v0.3.0)
npx @hivellm/rulebook validate
```

### 📊 Improvements

- **Test Count**: 53 tests (⬆️ from 41)
- **Coverage**: 95.28% (⬆️ from 93.96%)
- **Code Organization**: Better command structure
- **CI/CD**: Added GitHub Actions for the rulebook itself

### 🐛 Bug Fixes

- Fixed workflow generation integration in init command
- Fixed IDE files to respect coverage threshold
- Improved merger to properly update blocks sequentially

### 📦 What's Included

- **24 Templates** covering major AI coding tools
- **3 Language Templates**: Rust, TypeScript, Python
- **4 Module Templates**: Vectorizer, Synap, OpenSpec, Context7
- **4 IDE Templates**: Cursor, Windsurf, VS Code, Copilot
- **6 CLI Templates**: Aider, Continue, Claude, Gemini, Cursor CLI, Codeium
- **7 Workflow Templates**: GitHub Actions for all languages
- **3 CI/CD Workflows**: For rulebook project itself

### 🚀 Getting Started

```bash
# Navigate to your project
cd my-project

# Initialize rulebook
npx @hivellm/rulebook init

# Follow the prompts to configure:
# - Languages (auto-detected)
# - Project type
# - MCP modules
# - IDE preferences
# - Coverage threshold
# - Documentation strictness
# - Workflow generation

# Result:
# ✓ AGENTS.md generated/merged
# ✓ Workflows added to .github/workflows/
# ✓ IDE files created (.cursorrules, etc.)
# ✓ Project ready for AI-assisted development!
```

### 📚 Documentation

- Complete README with usage examples
- ROADMAP with implementation phases
- Getting Started guide
- Best Practices guide
- Testing guide
- CLI specification
- Example .rulesignore

### 🔧 Technical Details

**Technology Stack**:
- TypeScript 5.3+ with strict mode
- Commander for CLI
- Inquirer for interactive prompts
- Vitest for testing
- ESLint + Prettier for code quality

**Quality Metrics**:
- 53 tests passing (100%)
- 95.28% code coverage
- Zero lint warnings
- Full type safety
- Cross-platform compatible

### 🎯 Use Cases

1. **New Projects**: Set up standards from the start
2. **Existing Projects**: Merge standards with existing AGENTS.md
3. **Team Standardization**: Ensure consistent AI assistance across team
4. **Quality Enforcement**: Automated checks and thresholds
5. **Documentation**: Structured /docs directory
6. **CI/CD**: Ready-to-use GitHub Actions workflows

### 🔮 What's Next (v0.3.0)

- Project structure validation
- Documentation completeness checks
- Test coverage verification
- Dependency freshness checks
- Security audit integration
- Workflow customization options

### 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

### 📄 License

MIT - See [LICENSE](../LICENSE) for details.

---

## Version 0.1.0 - 2024-01-23

### 🎉 Initial Release

- Project scaffolding and TypeScript setup
- Auto-detection for Rust, TypeScript, and Python
- MCP module detection (Vectorizer, Synap, OpenSpec, Context7)
- Interactive CLI with project configuration
- Template system for languages, modules, and IDEs
- AGENTS.md generation with block-based structure
- Smart merging with existing AGENTS.md files
- .rulesignore support
- Comprehensive documentation
- 41 tests with 93.96% coverage
- NPX compatibility

### 📦 Initial Templates

- 3 Language templates
- 4 Module templates
- 4 IDE templates
- 6 CLI/API templates
- 7 Workflow templates
- Total: 24 comprehensive templates

