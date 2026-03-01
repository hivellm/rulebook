# Proposal: Multi-Tool Config Generation (GEMINI.md, Continue.dev, Windsurf)

## Why

To auto-generate AI assistant config files for all major tools when detected in a project.

## Context

The AI developer tools ecosystem has fragmented beyond just Claude Code and Cursor. Teams now use:
- **Google Gemini CLI** — requires `GEMINI.md` file (mirrors AGENTS.md pattern)
- **Continue.dev** — VS Code extension requiring `.continue/config.json` or `.continuerules` files
- **Windsurf** — Codeium's AI IDE requiring `.windsurfrules` file
- **GitHub Copilot** — `.github/copilot-instructions.md` for workspace instructions
- **Zed AI** — `.zed/settings.json` with custom prompt configuration

Rulebook should auto-detect which tools are present and generate appropriate config files.

## Solution

1. **Detection**: check for tool-specific indicators (config files, `.env` vars, installed extensions)
2. **Generation**: create tool-specific config files referencing `.rulebook/specs/`
3. **Templates**: add `templates/ides/` entries for each tool

## New Files Generated per Tool

| Tool | File Generated |
|------|---------------|
| Gemini CLI | `GEMINI.md` (mirrors AGENTS.md structure) |
| Continue.dev | `.continue/rules/*.md` |
| Windsurf | `.windsurfrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Zed | `.zed/settings.json` (prompt section) |

## Files to Modify

- `src/core/detector.ts` — detect each AI tool
- `src/core/generator.ts` — generate tool configs
- `templates/ides/` — new templates per tool
- `src/types.ts` — extend IDE detection types
- `tests/multi-tool-config.test.ts` — new test file
