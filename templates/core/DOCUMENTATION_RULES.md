# Documentation Standards

**CRITICAL**: All documentation in English. Root README concise, detailed docs in `/docs`.

## Structure

**Root-Level (ONLY):**
- `README.md` - Overview + quick start
- `CHANGELOG.md` - Version history
- `AGENTS.md` - AI instructions
- `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`

**All Other Docs in `/docs`:**
- `ARCHITECTURE.md`, `DEVELOPMENT.md`, `ROADMAP.md`
- `specs/`, `guides/`, `diagrams/`, `benchmarks/`

## Update Requirements by Commit Type

| Type | Update |
|------|--------|
| `feat` | README features, API docs, CHANGELOG "Added" |
| `fix` | Troubleshooting, CHANGELOG "Fixed" |
| `breaking` | CHANGELOG + migration guide, version docs |
| `perf` | Benchmarks, CHANGELOG "Performance" |
| `security` | SECURITY.md, CHANGELOG "Security" |
| `docs` | Verify spelling/links only |
| `refactor` | Update if behavior changed |

## Quality Checks (CI/CD)

```bash
markdownlint **/*.md         # Lint markdown
markdown-link-check **/*.md  # Check links
codespell **/*.md            # Spell check
```

**MUST pass before commit** (see AGENT_AUTOMATION).