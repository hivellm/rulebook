# Spec: Cursor MDC Rules Generation

## File Format Requirements

Each `.mdc` file SHALL contain YAML frontmatter:
```
---
description: <one line description>
globs: <glob pattern or empty for alwaysApply>
alwaysApply: <true|false>
---
```

- `rulebook.mdc` SHALL have `alwaysApply: true`, no globs
- Language files SHALL have `alwaysApply: false`, appropriate glob pattern
- `ralph.mdc` SHALL only be generated when Ralph is enabled in config
- `quality.mdc` SHALL have `alwaysApply: true`

## Detection Requirements

- SHALL detect Cursor if `.cursor/` directory exists in project root
- SHALL detect Cursor if `cursor` appears in `config.cliTools`
- SHALL NOT generate if Cursor is not detected

## Generation Requirements

- SHALL create `.cursor/rules/` directory if not exists
- SHALL generate `rulebook.mdc` always (when cursor detected)
- SHALL generate language-specific `.mdc` for each detected language
- SHALL be idempotent — overwrite on update, no duplicates
- SHALL NOT generate `.cursorrules` for new projects (keep for existing only)

## Content Requirements

- `.mdc` content SHALL be plain markdown after frontmatter
- SHALL reference `.rulebook/specs/` files rather than embedding full content
- SHALL include project-specific config where relevant
