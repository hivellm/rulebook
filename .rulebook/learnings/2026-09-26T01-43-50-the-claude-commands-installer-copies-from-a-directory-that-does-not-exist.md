# The .claude/commands installer copies from a directory that does not exist
**Source**: manual
**Date**: 2026-09-26
**Tags**: analysis:rulebook-simplification
claude-mcp.ts:104-115 (installClaudeCodeSkills) reads templates/commands, which is missing from the package, so it always returns [] and the "skills installed to .claude/commands" messages never print. Only .claude/skills (installDevSkills) is real. The installer and its call sites in claude.ts/init.ts/update.ts are dead code.