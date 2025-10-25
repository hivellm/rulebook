# Proposal: Standardize CLI Agent Implementations

## Why
The current CLI agent integration is inconsistent across different AI tools. Only `cursor-agent` has a complete implementation with stream-json parsing, real-time progress, and automatic completion detection. `claude-code` and `gemini-cli` lack proper implementation, and deprecated tools (`cursor-cli`, `claude-cli`, `gemini-cli-legacy`) are still present in the codebase. This creates maintenance overhead and inconsistent user experience.

## What Changes
- **REMOVED** Deprecated CLI tools: `cursor-cli`, `claude-cli`, `gemini-cli-legacy`
- **ADDED** Stream parser for `claude-code` based on official documentation
- **ADDED** Stream parser for `gemini-cli` based on official documentation
- **REFACTORED** CLI detection to support only: `cursor-agent`, `claude-code`, `gemini-cli`
- **STANDARDIZED** All parsers in `/src/agents/` directory
- **IMPROVED** Real-time progress indicators for all agents
- **IMPROVED** Automatic completion detection for all agents
- **UPDATED** Documentation for all supported CLI agents
- **ADDED** Integration tests for all three agents

## Impact
- Affected specs: CLI bridge, agent manager, command handling
- Affected code: `src/core/cli-bridge.ts`, `src/agents/`, `tests/cli-bridge.test.ts`
- Breaking change: Projects using `cursor-cli`, `claude-cli`, or `gemini-cli-legacy` will need to upgrade to supported tools
- New dependencies: None (using existing child_process.spawn)

