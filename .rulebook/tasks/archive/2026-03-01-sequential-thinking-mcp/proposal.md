# Proposal: Sequential Thinking MCP Detection and Recommendation

## Why

To standardize AI project setup with consistent, scalable patterns.

## Context

`sequential-thinking` MCP server is cited in 95%+ of quality AI agent setups and significantly improves problem-solving quality for complex tasks. It enables AI agents to:
- Break down complex problems step-by-step
- Revise thinking dynamically
- Explore multiple solution paths before committing

Currently rulebook detects 12 MCP modules but does not detect or recommend `sequential-thinking`.

## Solution

1. **Detect** if `sequential-thinking` MCP is configured:
   - Check `.cursor/mcp.json` for `@modelcontextprotocol/server-sequential-thinking`
   - Check `.mcp.json` for the same
   - Check package.json devDependencies

2. **Recommend** during `rulebook init` if not detected:
   - Show recommendation message with install instructions
   - Add to AGENTS.md under "Recommended MCP Servers" section

3. **Generate config** if user opts in:
   - Add to `.mcp.json`
   - Add usage directives to AGENTS.md

4. **Template**: add `templates/modules/sequential-thinking.md`

## Files to Modify

- `src/core/detector.ts` — add sequential-thinking detection
- `src/types.ts` — add to ModuleDetection
- `templates/modules/sequential-thinking.md` — new template
- `src/core/generator.ts` — include sequential-thinking section when detected
- `src/cli/commands.ts` — show recommendation if not detected
- `tests/sequential-thinking.test.ts` — new test file
