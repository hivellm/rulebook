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

## Automated Documentation Validation

**CRITICAL**: Documentation quality should be validated automatically via CI/CD:

```bash
# Markdown linting
markdownlint **/*.md                    # Check all markdown files
npm run docs:lint                       # If configured in package.json

# Link validation
markdown-link-check README.md           # Check for broken links
find . -name "*.md" -exec markdown-link-check {} \;  # Check all markdown

# Spell checking (via codespell or similar)
codespell **/*.md                       # Check spelling in all markdown
npm run docs:spell                      # If configured in package.json

# Code snippet testing (extract and validate code blocks)
# Manually test code examples from documentation
# Consider scripts to extract and validate code snippets
```

**Integration with CI/CD:**
- Add documentation linting to lint workflows
- Run markdown-link-check as part of quality gates
- Include codespell in CI pipeline
- Test code examples from documentation in test suites

## Continuous Documentation Updates

Documentation MUST be updated for every commit type following conventional commits:

### Documentation per Commit Type

**`feat` - New Feature:**
- ✅ Update feature list in README.md
- ✅ Add API documentation for new public APIs
- ✅ Update usage examples if affected
- ✅ Add to CHANGELOG.md under "Added"

**`fix` - Bug Fix:**
- ✅ Update troubleshooting section if relevant
- ✅ Update known issues list
- ✅ Add to CHANGELOG.md under "Fixed"
- ✅ Update affected examples

**`breaking` - Breaking Change:**
- ✅ **MUST** update CHANGELOG.md with migration guide
- ✅ Update major version documentation
- ✅ Document deprecation timeline
- ✅ Update API migration examples
- ✅ Add migration guide to /docs if major change

**`perf` - Performance Improvement:**
- ✅ Update performance benchmarks if applicable
- ✅ Update timing/cost documentation
- ✅ Add to CHANGELOG.md under "Performance"

**`security` - Security Fix:**
- ✅ Update SECURITY.md with vulnerability information
- ✅ Add to CHANGELOG.md under "Security"
- ✅ Document security implications
- ✅ Update security best practices if applicable

**`docs` - Documentation Only:**
- ✅ Automatic commit type for doc-only changes
- ✅ No additional documentation required
- ✅ Verify spelling and links

**`refactor` - Code Refactoring:**
- ✅ Update affected documentation
- ✅ Update examples if API changed internally
- ✅ Add to CHANGELOG.md if behavior changed

## Integration with AGENT_AUTOMATION

Documentation updates MUST align with AGENT_AUTOMATION Step 3 requirements:

**Automation Requirements:**
- All documentation changes must be included in automation report
- CHANGELOG.md updates must reference commit hash
- Documentation updates must pass automated quality checks
- Link validation must run before commit

**Verification Checklist (aligned with automation):**
```bash
✅ Documentation quality checks passed:
- [ ] Spell check: Passed
- [ ] Link validation: Passed
- [ ] Markdown linting: Passed
- [ ] Code examples: Tested
- [ ] CHANGELOG.md: Updated
- [ ] README.md: Updated (if public API changed)
- [ ] API docs: Updated (if applicable)
- [ ] Migration guide: Added (if breaking change)
```

**Auditability:**
- Documentation updates must be tracked in git commit history
- Changes must reference related implementation commits
- All documentation changes must pass CI validation
- Links to coverage reports must be included in documentation