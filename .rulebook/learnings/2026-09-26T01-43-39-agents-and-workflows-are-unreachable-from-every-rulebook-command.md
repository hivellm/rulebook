# Agents and workflows are unreachable from every rulebook command
**Source**: manual
**Date**: 2026-09-26
**Tags**: analysis:rulebook-simplification
setupClaudeCodeIntegration(cwd) is called with no options by claude.ts:37, init.ts:500 and update.ts:553. claude-mcp.ts:347-365 installs agents/workflows only when includeAgents/includeWorkflows are set, so no command ever installs or refreshes .claude/agents and .claude/workflows; copies installed before v7 rot (this repo: Rust-filled agents in a TypeScript project, spec-author.js drifted). Fix candidate: refresh-if-present on update plus an opt-in flag.