# Documentation Standards

**CRITICAL**: All documentation must be written in English.

## Documentation Language Requirements

- ✅ All markdown files must be written in English
- ✅ Code comments should be in English
- ✅ README files must be in English
- ✅ API documentation must be in English
- ✅ User-facing messages can be localized (pt-BR/en) via configuration
- ❌ Never create documentation in other languages

## Documentation Structure

### Allowed Root-Level Documentation
Only these files are allowed in the project root:
- ✅ `README.md` - Project overview and quick start
- ✅ `CHANGELOG.md` - Version history and release notes
- ✅ `AGENTS.md` - AI assistant instructions
- ✅ `LICENSE` - Project license
- ✅ `CONTRIBUTING.md` - Contribution guidelines
- ✅ `CODE_OF_CONDUCT.md` - Code of conduct
- ✅ `SECURITY.md` - Security policy

### All Other Documentation
**ALL other documentation MUST go in `/docs` directory**:
- `/docs/ARCHITECTURE.md` - System architecture
- `/docs/DEVELOPMENT.md` - Development guide
- `/docs/ROADMAP.md` - Project roadmap
- `/docs/DAG.md` - Component dependencies (DAG)
- `/docs/specs/` - Feature specifications
- `/docs/sdks/` - SDK documentation
- `/docs/protocols/` - Protocol specifications
- `/docs/guides/` - Developer guides
- `/docs/diagrams/` - Architecture diagrams
- `/docs/benchmarks/` - Performance benchmarks
- `/docs/versions/` - Version release reports

## Content Standards

- Use clear, concise English
- Follow standard technical writing conventions
- Include code examples where appropriate
- Keep documentation up-to-date with code changes
- Use consistent terminology throughout
- Include proper headings and structure
- Add table of contents for long documents

## Quality Checks

- Spell check all documentation
- Verify all links work
- Ensure code examples are tested
- Review for clarity and completeness
- Check for outdated information
